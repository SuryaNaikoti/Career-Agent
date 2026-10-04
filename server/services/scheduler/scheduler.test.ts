import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleCalculator } from './scheduleCalculator.js';
import { backgroundSchedulingService } from './backgroundSchedulingService.js';
import { backgroundRunnerService } from './backgroundRunnerService.js';
import { setTestDatabaseDouble, DatabaseNotConfiguredError } from '../supabaseClient.js';
import { autonomousJobSearchEngine } from '../agentEngine/autonomousJobSearchEngine.js';
import { dailyCareerReportService } from '../notification/dailyCareerReportService.js';
import express from 'express';
import http from 'node:http';
import { schedulerRouter } from '../../api/scheduler.js';

process.env.NODE_ENV = 'test';

describe('MODULE 14: Background Automation & Scheduling Engine', () => {
  const candidateId = 'cand-m14-test-user-01';

  // In-memory mock DB store for tests
  let mockDbSchedules: any[] = [];
  let mockDbClaims: any[] = [];
  let mockDbHistory: any[] = [];

  function createMockSupabaseClient() {
    return {
      from: (table: string) => {
        let currentTable = table;
        let queryFilters: any[] = [];
        let querySelect = '*';
        let queryLimit: number | null = null;
        let queryOrder: { col: string; ascending: boolean } | null = null;

        const builder = {
          select: (sel: string) => {
            querySelect = sel;
            return builder;
          },
          eq: (col: string, val: any) => {
            queryFilters.push({ type: 'eq', col, val });
            return builder;
          },
          gt: (col: string, val: any) => {
            queryFilters.push({ type: 'gt', col, val });
            return builder;
          },
          lte: (col: string, val: any) => {
            queryFilters.push({ type: 'lte', col, val });
            return builder;
          },
          lt: (col: string, val: any) => {
            queryFilters.push({ type: 'lt', col, val });
            return builder;
          },
          in: (col: string, vals: any[]) => {
            queryFilters.push({ type: 'in', col, vals });
            return builder;
          },
          order: (col: string, opts?: { ascending?: boolean }) => {
            queryOrder = { col, ascending: opts?.ascending ?? true };
            return builder;
          },
          limit: (n: number) => {
            queryLimit = n;
            return builder;
          },
          single: async () => {
            const res = await builder.then();
            return { data: res.data?.[0] || null, error: res.data?.[0] ? null : { message: 'Row not found' } };
          },
          maybeSingle: async () => {
            const res = await builder.then();
            return { data: res.data?.[0] || null, error: null };
          },
          upsert: (records: any | any[], opts?: { onConflict?: string }) => {
            const arr = Array.isArray(records) ? records : [records];
            for (const r of arr) {
              if (currentTable === 'background_schedules') {
                const idx = mockDbSchedules.findIndex(
                  (s) => s.user_id === r.user_id && s.schedule_type === r.schedule_type
                );
                if (idx >= 0) {
                  mockDbSchedules[idx] = { ...mockDbSchedules[idx], ...r, updated_at: new Date().toISOString() };
                } else {
                  mockDbSchedules.push({
                    id: r.id || `sched-${Date.now()}-${Math.random()}`,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    ...r,
                  });
                }
              }
            }
            const upsertBuilder: any = {
              select: () => upsertBuilder,
              single: async () => {
                const found = mockDbSchedules.find(
                  (s) => s.user_id === arr[0].user_id && s.schedule_type === arr[0].schedule_type
                );
                return { data: found || arr[0], error: null };
              },
              then: async (resolve?: any) => {
                const res = { data: arr, error: null };
                return resolve ? resolve(res) : res;
              },
            };
            return upsertBuilder;
          },
          insert: async (records: any | any[]) => {
            const arr = Array.isArray(records) ? records : [records];
            if (currentTable === 'background_job_claims') {
              for (const r of arr) {
                // Unique constraint on (schedule_id, schedule_type)
                const exists = mockDbClaims.find(
                  (c) => c.schedule_id === r.schedule_id && c.schedule_type === r.schedule_type && !c.is_released
                );
                if (exists) {
                  return { data: null, error: { message: 'Duplicate claim key violation', code: '23505' } };
                }
                const inserted = { id: `claim-${Date.now()}-${Math.random()}`, created_at: new Date().toISOString(), ...r };
                mockDbClaims.push(inserted);
              }
              return { data: arr, error: null };
            }

            if (currentTable === 'background_execution_history') {
              for (const r of arr) {
                const inserted = { id: `hist-${Date.now()}-${Math.random()}`, created_at: new Date().toISOString(), ...r };
                mockDbHistory.push(inserted);
              }
              return { data: arr, error: null };
            }

            if (currentTable === 'background_schedules') {
              for (const r of arr) {
                const inserted = { id: `sched-${Date.now()}-${Math.random()}`, created_at: new Date().toISOString(), ...r };
                mockDbSchedules.push(inserted);
              }
              return { data: arr, error: null };
            }

            return { data: arr, error: null };
          },
          update: (updates: any) => {
            const updateBuilder: any = {
              eq: (col: string, val: any) => {
                queryFilters.push({ type: 'eq', col, val });
                return updateBuilder;
              },
              lte: (col: string, val: any) => {
                queryFilters.push({ type: 'lte', col, val });
                return updateBuilder;
              },
              select: (sel?: string) => {
                return updateBuilder;
              },
              then: async (resolve?: any) => {
                let targets: any[] = [];
                if (currentTable === 'background_schedules') targets = mockDbSchedules;
                if (currentTable === 'background_job_claims') targets = mockDbClaims;
                if (currentTable === 'background_execution_history') targets = mockDbHistory;

                const affected: any[] = [];
                for (const item of targets) {
                  const matches = queryFilters.every((f) => {
                    if (f.type === 'eq') return item[f.col] === f.val;
                    if (f.type === 'lte') return item[f.col] <= f.val;
                    if (f.type === 'lt') return item[f.col] < f.val;
                    if (f.type === 'gt') return item[f.col] > f.val;
                    return true;
                  });
                  if (matches) {
                    Object.assign(item, updates, { updated_at: new Date().toISOString() });
                    affected.push(item);
                  }
                }
                const res = { data: affected, error: null };
                return resolve ? resolve(res) : res;
              },
            };
            return updateBuilder;
          },
          delete: () => {
            return {
              eq: (col: string, val: any) => {
                if (currentTable === 'background_job_claims') {
                  mockDbClaims = mockDbClaims.filter((c) => c[col] !== val);
                }
                return Promise.resolve({ data: null, error: null });
              },
              lt: (col: string, val: any) => {
                if (currentTable === 'background_job_claims') {
                  mockDbClaims = mockDbClaims.filter((c) => !(c[col] < val));
                }
                return Promise.resolve({ data: null, error: null });
              },
            };
          },
          then: async (resolve?: (val: any) => any) => {
            let items: any[] = [];
            if (currentTable === 'background_schedules') items = [...mockDbSchedules];
            if (currentTable === 'background_job_claims') items = [...mockDbClaims];
            if (currentTable === 'background_execution_history') items = [...mockDbHistory];

            for (const f of queryFilters) {
              if (f.type === 'eq') items = items.filter((x) => x[f.col] === f.val);
              if (f.type === 'lte') items = items.filter((x) => x[f.col] <= f.val);
              if (f.type === 'lt') items = items.filter((x) => x[f.col] < f.val);
              if (f.type === 'in') items = items.filter((x) => f.vals.includes(x[f.col]));
            }

            if (queryOrder) {
              const { col, ascending } = queryOrder;
              items.sort((a, b) => {
                if (a[col] < b[col]) return ascending ? -1 : 1;
                if (a[col] > b[col]) return ascending ? 1 : -1;
                return 0;
              });
            }

            if (queryLimit !== null) {
              items = items.slice(0, queryLimit);
            }

            const res = { data: items, error: null };
            return resolve ? resolve(res) : res;
          },
        };

        return builder;
      },
    };
  }

  before(() => {
    mockDbSchedules = [];
    mockDbClaims = [];
    mockDbHistory = [];
  });

  after(() => {
    setTestDatabaseDouble(null);
  });

  // ==========================================
  // TEST GROUP 1: Schedule Calculator & Timezones
  // ==========================================
  describe('Schedule Calculator & Timezone Precision', () => {
    it('validates 24-hour HH:MM format', () => {
      assert.equal(scheduleCalculator.isValidTimeFormat('09:00'), true);
      assert.equal(scheduleCalculator.isValidTimeFormat('23:59'), true);
      assert.equal(scheduleCalculator.isValidTimeFormat('00:00'), true);
      assert.equal(scheduleCalculator.isValidTimeFormat('24:00'), false);
      assert.equal(scheduleCalculator.isValidTimeFormat('9:00'), false);
      assert.equal(scheduleCalculator.isValidTimeFormat('invalid'), false);
    });

    it('validates standard IANA timezones', () => {
      assert.equal(scheduleCalculator.isValidTimezone('America/New_York'), true);
      assert.equal(scheduleCalculator.isValidTimezone('Asia/Kolkata'), true);
      assert.equal(scheduleCalculator.isValidTimezone('UTC'), true);
      assert.equal(scheduleCalculator.isValidTimezone('Invalid/Zone'), false);
    });

    it('calculates future run time within today if target time is later today', () => {
      const fixedNow = new Date('2026-10-04T05:00:00.000Z');
      const nextRunIso = scheduleCalculator.computeNextRunAt('09:00', 'UTC', fixedNow);
      const nextRun = new Date(nextRunIso);

      assert.equal(nextRun.getUTCHours(), 9);
      assert.equal(nextRun.getUTCMinutes(), 0);
      assert.equal(nextRun.getUTCDate(), 4);
    });

    it('rolls over to next day if target time has already passed today', () => {
      const fixedNow = new Date('2026-10-04T12:00:00.000Z');
      const nextRunIso = scheduleCalculator.computeNextRunAt('09:00', 'UTC', fixedNow);
      const nextRun = new Date(nextRunIso);

      assert.equal(nextRun.getUTCHours(), 9);
      assert.equal(nextRun.getUTCMinutes(), 0);
      assert.equal(nextRun.getUTCDate(), 5); // next day
    });

    it('handles timezone offsets accurately (e.g. Asia/Kolkata UTC+5:30)', () => {
      // 09:00 in Asia/Kolkata is 03:30 UTC
      const fixedNow = new Date('2026-10-04T02:00:00.000Z');
      const nextRunIso = scheduleCalculator.computeNextRunAt('09:00', 'Asia/Kolkata', fixedNow);
      const nextRun = new Date(nextRunIso);

      assert.equal(nextRun.getUTCHours(), 3);
      assert.equal(nextRun.getUTCMinutes(), 30);
      assert.equal(nextRun.getUTCDate(), 4);
    });
  });

  // ==========================================
  // TEST GROUP 2: Database Configuration & Fail Closed
  // ==========================================
  describe('Database Boundary & Fail Closed', () => {
    it('throws DatabaseNotConfiguredError when Supabase is not configured', async () => {
      setTestDatabaseDouble(null); // Ensure null client

      await assert.rejects(
        async () => {
          await backgroundSchedulingService.getSchedulesForUser(candidateId);
        },
        (err: any) => {
          assert.equal(err instanceof DatabaseNotConfiguredError, true);
          return true;
        }
      );
    });

    it('HTTP endpoints return 503 DATABASE_NOT_CONFIGURED when DB is missing', async () => {
      setTestDatabaseDouble(null);

      const app = express();
      app.use(express.json());
      app.use('/api/scheduler', schedulerRouter);

      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/scheduler/preferences`, {
          headers: { Authorization: `Bearer test-token:${candidateId}` },
        });
        const body: any = await res.json();
        assert.equal(res.status, 503);
        assert.equal(body.error.code, 'DATABASE_NOT_CONFIGURED');
      } finally {
        server.close();
      }
    });

    it('HTTP endpoints reject unauthenticated requests with 401', async () => {
      const app = express();
      app.use(express.json());
      app.use('/api/scheduler', schedulerRouter);

      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/scheduler/preferences`);
        const body: any = await res.json();
        assert.equal(res.status, 401);
        assert.equal(body.authenticated, false);

        // Also verify /api/scheduler/tick rejects unauthenticated
        const tickRes = await fetch(`http://127.0.0.1:${port}/api/scheduler/tick`, { method: 'POST' });
        const tickBody: any = await tickRes.json();
        assert.equal(tickRes.status, 401);
        assert.equal(tickBody.authenticated, false);
      } finally {
        server.close();
      }
    });

    it('HTTP /api/scheduler/tick authorizes with CRON_SECRET bearer token', async () => {
      process.env.CRON_SECRET = 'test-secret-key-12345';
      const app = express();
      app.use(express.json());
      app.use('/api/scheduler', schedulerRouter);

      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;

      try {
        // Reject invalid secret
        const invalidRes = await fetch(`http://127.0.0.1:${port}/api/scheduler/tick`, {
          method: 'POST',
          headers: { Authorization: 'Bearer wrong-secret' },
        });
        assert.equal(invalidRes.status, 401);

        // Accept valid CRON_SECRET (even when DB returns 503 or 200)
        const validRes = await fetch(`http://127.0.0.1:${port}/api/scheduler/tick`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
        });
        // DB is null so it reaches handler and returns 503 DATABASE_NOT_CONFIGURED (not 401 Unauthorized)
        assert.equal(validRes.status, 503);
      } finally {
        delete process.env.CRON_SECRET;
        server.close();
      }
    });
  });

  // ==========================================
  // TEST GROUP 3: Scheduling Service CRUD & Persistence
  // ==========================================
  describe('Scheduling Preferences & Persistence (Test Double)', () => {
    before(() => {
      mockDbSchedules = [];
      setTestDatabaseDouble(createMockSupabaseClient() as any);
    });

    it('initializes default schedules if none exist', async () => {
      const schedules = await backgroundSchedulingService.getSchedulesForUser(candidateId);
      assert.equal(schedules.length, 2);
      assert.equal(schedules.some((s) => s.scheduleType === 'JOB_SEARCH'), true);
      assert.equal(schedules.some((s) => s.scheduleType === 'DAILY_REPORT'), true);
    });

    it('updates preferred time and recomputes nextRunAt', async () => {
      const updated = await backgroundSchedulingService.updateSchedule(
        candidateId,
        'JOB_SEARCH',
        {
          preferredTime: '11:00',
          timezone: 'UTC',
          isEnabled: true,
        }
      );

      assert.equal(updated.preferredTime, '11:00');
      assert.equal(updated.isEnabled, true);
      const nextRunDate = new Date(updated.nextRunAt);
      assert.equal(nextRunDate.getUTCHours(), 11);
    });

    it('rejects invalid time format with error', async () => {
      await assert.rejects(async () => {
        await backgroundSchedulingService.updateSchedule(
          candidateId,
          'JOB_SEARCH',
          { preferredTime: '99:99' }
        );
      });
    });
  });

  // ==========================================
  // TEST GROUP 4: Job Claiming, Overlapping Runs & Stale Leases
  // ==========================================
  describe('Distributed Job Claiming & Lease Concurrency', () => {
    before(() => {
      mockDbClaims = [];
      setTestDatabaseDouble(createMockSupabaseClient() as any);
    });

    it('successfully acquires a claim for a candidate schedule', async () => {
      const dummySchedule: any = {
        id: 'sched-101',
        userId: candidateId,
        scheduleType: 'JOB_SEARCH',
      };

      const claim = await backgroundRunnerService.tryClaimSchedule(dummySchedule);
      assert.ok(claim);
      assert.ok(claim.claimId);
      assert.equal(mockDbClaims.length, 1);
    });

    it('prevents overlapping runs for the same candidate and schedule type', async () => {
      const dummySchedule: any = {
        id: 'sched-101',
        userId: candidateId,
        scheduleType: 'JOB_SEARCH',
      };

      const secondClaim = await backgroundRunnerService.tryClaimSchedule(dummySchedule);
      assert.equal(secondClaim, null); // Blocked
    });

    it('recovers stale claims from expired leases (e.g. worker crashed)', async () => {
      mockDbClaims[0].lease_expires_at = new Date(Date.now() - 60000).toISOString();

      const recovered = await backgroundRunnerService.recoverStaleClaims();
      assert.equal(recovered >= 1, true);
      assert.equal(mockDbClaims[0].is_released, true);
    });
  });

  // ==========================================
  // TEST GROUP 5: Execution Runner & Service Invocations
  // ==========================================
  describe('Background Runner Execution & Module Hand-offs', () => {
    before(() => {
      mockDbClaims = [];
      mockDbHistory = [];
      mockDbSchedules = [];
      setTestDatabaseDouble(createMockSupabaseClient() as any);
    });

    it('executes due JOB_SEARCH by triggering Module 13 autonomous engine in SCHEDULED mode', async () => {
      // Seed schedules
      await backgroundSchedulingService.getSchedulesForUser(candidateId);
      const sched = await backgroundSchedulingService.updateSchedule(
        candidateId,
        'JOB_SEARCH',
        { isEnabled: true, preferredTime: '08:00', timezone: 'UTC' }
      );

      // Force past due next_run_at in mock DB
      const dbSched = mockDbSchedules.find((s) => s.schedule_type === 'JOB_SEARCH');
      dbSched.next_run_at = new Date(Date.now() - 3600000).toISOString();

      // Mock Module 13 startSession
      let triggeredWithMode: string | null = null;
      const originalStartSession = autonomousJobSearchEngine.startSession;
      autonomousJobSearchEngine.startSession = async (cid, opts) => {
        triggeredWithMode = opts?.mode || null;
        return {
          session: {
            id: 'sess-m14-scheduled-01',
            status: 'COMPLETED',
            summary: {
              jobsFound: 5,
              jobsMatched: 2,
              applicationsPrepared: 1,
              applicationsSubmitted: 0,
            },
          },
          events: [],
        } as any;
      };

      try {
        const tickResult = await backgroundRunnerService.executeSchedulerTick();
        assert.equal(tickResult.processedCount >= 1, true);
        assert.equal(triggeredWithMode, 'SCHEDULED');

        // Verify execution history was persisted
        const history = await backgroundRunnerService.getExecutionHistory(candidateId);
        assert.equal(history.length >= 1, true);
        assert.equal(history[0].status, 'COMPLETED');
        assert.equal(history[0].scheduleType, 'JOB_SEARCH');
      } finally {
        autonomousJobSearchEngine.startSession = originalStartSession;
      }
    });

    it('executes due DAILY_REPORT by triggering Module 12 dailyCareerReportService', async () => {
      await backgroundSchedulingService.getSchedulesForUser(candidateId);
      const sched = await backgroundSchedulingService.updateSchedule(
        candidateId,
        'DAILY_REPORT',
        { isEnabled: true, preferredTime: '18:00', timezone: 'UTC' }
      );

      const dbSched = mockDbSchedules.find((s) => s.schedule_type === 'DAILY_REPORT');
      dbSched.next_run_at = new Date(Date.now() - 3600000).toISOString();

      let reportTriggered = false;
      const originalGetReport = dailyCareerReportService.getOrGenerateReport;
      dailyCareerReportService.getOrGenerateReport = async (cid, opts) => {
        reportTriggered = true;
        return {
          report: {
            id: 'rep-m14-test-01',
            reportDate: '2026-10-04',
            summary: 'Daily summary generated by background worker',
          },
        } as any;
      };

      try {
        const tickResult = await backgroundRunnerService.executeSchedulerTick();
        assert.equal(tickResult.processedCount >= 1, true);
        assert.equal(reportTriggered, true);

        const history = await backgroundRunnerService.getExecutionHistory(candidateId);
        const reportEntry = history.find((h) => h.scheduleType === 'DAILY_REPORT');
        assert.ok(reportEntry);
        assert.equal(reportEntry.status, 'COMPLETED');
      } finally {
        dailyCareerReportService.getOrGenerateReport = originalGetReport;
      }
    });

    it('records FAILED history and increments consecutiveFailures on unhandled error', async () => {
      await backgroundSchedulingService.getSchedulesForUser(candidateId);
      const sched = await backgroundSchedulingService.updateSchedule(
        candidateId,
        'JOB_SEARCH',
        { isEnabled: true, preferredTime: '09:00', timezone: 'UTC' }
      );

      const dbSched = mockDbSchedules.find((s) => s.schedule_type === 'JOB_SEARCH');
      dbSched.next_run_at = new Date(Date.now() - 3600000).toISOString();

      const originalStartSession = autonomousJobSearchEngine.startSession;
      autonomousJobSearchEngine.startSession = async () => {
        throw new Error('Simulated upstream engine timeout');
      };

      try {
        const tickResult = await backgroundRunnerService.executeSchedulerTick();
        assert.equal(tickResult.errorsCount >= 1, true);

        const history = await backgroundRunnerService.getExecutionHistory(candidateId);
        const failedEntry = history.find((h) => h.status === 'FAILED');
        assert.ok(failedEntry);
        assert.equal(failedEntry.errorDetails?.message, 'Simulated upstream engine timeout');
      } finally {
        autonomousJobSearchEngine.startSession = originalStartSession;
      }
    });
  });
});

