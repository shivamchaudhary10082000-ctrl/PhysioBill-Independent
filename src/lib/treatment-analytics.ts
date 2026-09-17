import { getSupabaseClient } from '@/lib/supabase';
import type {
  TreatmentEpisodeCategory,
  TreatmentEpisodeStatus,
} from '@/lib/treatment-episodes';
import { resolveAuthenticatedPhysiotherapist } from '@/lib/workspace';

export type TreatmentHistoryEventType =
  | 'INITIAL_STATE'
  | 'STATUS_TRANSITION'
  | 'BACKFILL_STATE';

export type TreatmentPeriodEpisode = {
  id: string;
  patientId: string;
  title: string;
  category: TreatmentEpisodeCategory;
  startedAt: string;
  visitCount: number;
  statusAtMonthEnd: TreatmentEpisodeStatus | null;
  statusEventType: TreatmentHistoryEventType | null;
};

export type TreatmentPeriodPatient = {
  patientId: string;
  visitCount: number;
  unlinkedVisitCount: number;
  episodes: TreatmentPeriodEpisode[];
};

export type TreatmentPeriodAnalytics = {
  monthStart: string;
  nextMonthStart: string;
  patientsTreated: number;
  visits: number;
  ongoingAtMonthEnd: number;
  recoveredDischarged: number;
  leftDiscontinued: number;
  patients: TreatmentPeriodPatient[];
};

type PeriodVisitRow = {
  id: string;
  patient_id: string;
  visit_date: string;
  treatment_episode_id: string | null;
};

type EpisodeRow = {
  id: string;
  patient_id: string;
  title: string;
  category: TreatmentEpisodeCategory;
  started_at: string;
};

type HistoryRow = {
  patient_id: string;
  treatment_episode_id: string;
  event_type: TreatmentHistoryEventType;
  from_status: TreatmentEpisodeStatus | null;
  to_status: TreatmentEpisodeStatus;
  changed_at: string;
  event_order: number;
};

type PeriodBounds = {
  monthStart: string;
  nextMonthStart: string;
  historyMonthStart: string;
  historyNextMonthStart: string;
};

function twoDigits(value: number) {
  return String(value).padStart(2, '0');
}

function localDate(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day, 0, 0, 0, 0);
}

export function treatmentAnalyticsPeriod(year: number, month: number): PeriodBounds {
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    throw new Error('Invalid analytics year.');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Invalid analytics month.');
  }

  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const monthStart = `${year}-${twoDigits(month)}-01`;
  const nextMonthStart = `${nextYear}-${twoDigits(nextMonth)}-01`;

  return {
    monthStart,
    nextMonthStart,
    historyMonthStart: localDate(year, month - 1, 1).toISOString(),
    historyNextMonthStart: localDate(nextYear, nextMonth - 1, 1).toISOString(),
  };
}

function isLaterHistoryEvent(candidate: HistoryRow, current: HistoryRow) {
  const candidateTime = Date.parse(candidate.changed_at);
  const currentTime = Date.parse(current.changed_at);
  if (candidateTime !== currentTime) return candidateTime > currentTime;
  return Number(candidate.event_order) > Number(current.event_order);
}

function latestStateByEpisode(rows: HistoryRow[]) {
  const latest = new Map<string, HistoryRow>();
  rows.forEach((row) => {
    const current = latest.get(row.treatment_episode_id);
    if (!current || isLaterHistoryEvent(row, current)) {
      latest.set(row.treatment_episode_id, row);
    }
  });
  return latest;
}

export async function loadTreatmentPeriodAnalytics(input: {
  year: number;
  month: number;
}): Promise<TreatmentPeriodAnalytics> {
  const bounds = treatmentAnalyticsPeriod(input.year, input.month);
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();

  const [visitsResult, historyResult] = await Promise.all([
    supabase
      .from('visits')
      .select('id,patient_id,visit_date,treatment_episode_id')
      .eq('physio_id', bootstrap.physioId)
      .gte('visit_date', bounds.monthStart)
      .lt('visit_date', bounds.nextMonthStart)
      .order('visit_date', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('treatment_episode_status_history')
      .select(
        'patient_id,treatment_episode_id,event_type,from_status,to_status,changed_at,event_order',
      )
      .eq('physio_id', bootstrap.physioId)
      .lt('changed_at', bounds.historyNextMonthStart)
      .order('changed_at', { ascending: true })
      .order('event_order', { ascending: true }),
  ]);

  if (visitsResult.error) throw visitsResult.error;
  if (historyResult.error) throw historyResult.error;

  const periodVisits = visitsResult.data as PeriodVisitRow[];
  const history = historyResult.data as HistoryRow[];
  const latestAtMonthEnd = latestStateByEpisode(history);

  const episodeIds = Array.from(
    new Set(
      periodVisits
        .map((visit) => visit.treatment_episode_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let episodes: EpisodeRow[] = [];
  if (episodeIds.length) {
    const { data, error } = await supabase
      .from('treatment_episodes')
      .select('id,patient_id,title,category,started_at')
      .eq('physio_id', bootstrap.physioId)
      .in('id', episodeIds)
      .order('started_at', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    episodes = data as EpisodeRow[];
  }

  const episodeById = new Map(episodes.map((episode) => [episode.id, episode]));
  const patientGroups = new Map<
    string,
    {
      visitCount: number;
      unlinkedVisitCount: number;
      episodeVisitCounts: Map<string, number>;
    }
  >();

  periodVisits.forEach((visit) => {
    const group = patientGroups.get(visit.patient_id) ?? {
      visitCount: 0,
      unlinkedVisitCount: 0,
      episodeVisitCounts: new Map<string, number>(),
    };
    group.visitCount += 1;
    if (visit.treatment_episode_id) {
      group.episodeVisitCounts.set(
        visit.treatment_episode_id,
        (group.episodeVisitCounts.get(visit.treatment_episode_id) ?? 0) + 1,
      );
    } else {
      group.unlinkedVisitCount += 1;
    }
    patientGroups.set(visit.patient_id, group);
  });

  const patients = Array.from(patientGroups.entries()).map(([patientId, group]) => {
    const patientEpisodes = Array.from(group.episodeVisitCounts.entries())
      .map(([episodeId, visitCount]) => {
        const episode = episodeById.get(episodeId);
        if (!episode) return null;
        const latest = latestAtMonthEnd.get(episodeId) ?? null;
        return {
          id: episode.id,
          patientId: episode.patient_id,
          title: episode.title,
          category: episode.category,
          startedAt: episode.started_at,
          visitCount,
          statusAtMonthEnd: latest?.to_status ?? null,
          statusEventType: latest?.event_type ?? null,
        } satisfies TreatmentPeriodEpisode;
      })
      .filter((episode): episode is TreatmentPeriodEpisode => episode !== null);

    return {
      patientId,
      visitCount: group.visitCount,
      unlinkedVisitCount: group.unlinkedVisitCount,
      episodes: patientEpisodes,
    } satisfies TreatmentPeriodPatient;
  });

  const outcomeEvents = history.filter((event) => {
    const changedAt = Date.parse(event.changed_at);
    return (
      changedAt >= Date.parse(bounds.historyMonthStart) &&
      changedAt < Date.parse(bounds.historyNextMonthStart)
    );
  });

  return {
    monthStart: bounds.monthStart,
    nextMonthStart: bounds.nextMonthStart,
    patientsTreated: patientGroups.size,
    visits: periodVisits.length,
    ongoingAtMonthEnd: Array.from(latestAtMonthEnd.values()).filter(
      (event) => event.to_status === 'ONGOING',
    ).length,
    recoveredDischarged: outcomeEvents.filter(
      (event) => event.to_status === 'RECOVERED_DISCHARGED',
    ).length,
    leftDiscontinued: outcomeEvents.filter(
      (event) => event.to_status === 'LEFT_DISCONTINUED',
    ).length,
    patients,
  };
}
