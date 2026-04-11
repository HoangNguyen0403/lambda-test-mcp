import { jest } from '@jest/globals';
import nock from 'nock';
import { LambdaTestClient } from '../src/api.js';

describe('LambdaTestClient', () => {
  const username = 'test-user';
  const accessKey = 'test-key';
  const client = new LambdaTestClient(username, accessKey);

  afterEach(() => {
    nock.cleanAll();
  });

  describe('getBuildSessions', () => {
    it('should fetch build sessions successfully', async () => {
      const buildId = '12345';
      const mockResponse = {
        data: {
          data: [
            {
              id: 'session1',
              name: 'Test 1',
              status_ind: 'passed',
              duration: 10,
              build_id: buildId,
            },
          ],
          meta: { total: 1 },
        },
      };

      nock('https://mobile-api.lambdatest.com')
        .get('/mobile-automation/api/v1/sessions')
        .query({ build_id: buildId, limit: 200 })
        .reply(200, mockResponse);

      const sessions = await client.getBuildSessions(buildId);
      expect(sessions).toEqual(mockResponse.data.data);
    });

    it('should return null if body is empty', async () => {
      nock('https://mobile-api.lambdatest.com')
        .get('/mobile-automation/api/v1/sessions')
        .query(true)
        .reply(200, ' ');

      const sessions = await (client as any).get('/sessions?build_id=123');
      expect(sessions).toBeNull();
    });

    it('should throw error on invalid JSON', async () => {
      nock('https://mobile-api.lambdatest.com')
        .get('/mobile-automation/api/v1/sessions')
        .query(true)
        .reply(200, '{ invalid json }');

      await expect((client as any).get('/sessions?build_id=123')).rejects.toThrow(
        'LambdaTest API returned invalid JSON',
      );
    });

    it('should return an empty array if data is missing', async () => {
      nock('https://mobile-api.lambdatest.com')
        .get('/mobile-automation/api/v1/sessions')
        .query(true)
        .reply(200, { data: {} });

      const sessions = await client.getBuildSessions('123');
      expect(sessions).toEqual([]);
    });

    it('should handle API errors with body', async () => {
      const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
      nock('https://mobile-api.lambdatest.com')
        .get('/mobile-automation/api/v1/sessions')
        .query(true)
        .reply(401, 'Unauthorized access', { 'Content-Type': 'text/plain' });

      await expect(client.getBuildSessions('123')).rejects.toThrow(
        'LambdaTest API 401: Unauthorized',
      );
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('LambdaTest API response body: Unauthorized access'),
      );
      stderrSpy.mockRestore();
    });

    it('should handle API errors without body', async () => {
      nock('https://mobile-api.lambdatest.com')
        .get('/mobile-automation/api/v1/sessions')
        .query(true)
        .reply(500);

      await expect(client.getBuildSessions('123')).rejects.toThrow(
        'LambdaTest API 500: Internal Server Error',
      );
    });
  });

  describe('getSession', () => {
    it('should fetch session details successfully', async () => {
      const sessionId = 'session1';
      const mockResponse = { data: { id: sessionId, video_url: 'http://video' } };

      nock('https://mobile-api.lambdatest.com')
        .get(`/mobile-automation/api/v1/sessions/${sessionId}`)
        .reply(200, mockResponse);

      const session = await client.getSession(sessionId);
      expect(session).toEqual(mockResponse.data);
    });
  });

  describe('getSessionLog', () => {
    it('should fetch session logs as text', async () => {
      const sessionId = 'session1';
      const mockLog = 'log content';

      nock('https://mobile-api.lambdatest.com')
        .get(`/mobile-automation/api/v1/sessions/${sessionId}/log/instrumentation`)
        .reply(200, mockLog);

      const log = await client.getSessionLog(sessionId);
      expect(log).toBe(mockLog);
    });

    it('should throw error on log fetch failure', async () => {
      const sessionId = 'session1';
      nock('https://mobile-api.lambdatest.com')
        .get(`/mobile-automation/api/v1/sessions/${sessionId}/log/instrumentation`)
        .reply(404, 'Not Found');

      await expect(client.getSessionLog(sessionId)).rejects.toThrow(
        'LambdaTest API 404: Not Found',
      );
    });
  });
});
