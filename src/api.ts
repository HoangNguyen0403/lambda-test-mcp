const MOBILE_BASE = 'https://mobile-api.lambdatest.com/mobile-automation/api/v1';

export interface LTSession {
  id: string;
  name: string;
  status_ind: string;
  duration: number;
  build_id: string;
}

export interface LTSessionDetail extends LTSession {
  video_url: string;
  console_logs_url: string;
  device: string;
  os_version: string;
}

export interface LTBuildSessionsResponse {
  data: {
    data: LTSession[];
    meta: { total: number };
  };
}

export interface LTSessionResponse {
  data: LTSessionDetail;
}

export class LambdaTestClient {
  private authHeader: string;

  constructor(username: string, accessKey: string) {
    this.authHeader = `Basic ${Buffer.from(`${username}:${accessKey}`).toString('base64')}`;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${MOBILE_BASE}${path}`, {
      headers: { Authorization: this.authHeader },
    });
    const body = await res.text().catch(() => '');
    if (!res.ok) {
      if (body) process.stderr.write(`LambdaTest API response body: ${body}\n`);
      throw new Error(`LambdaTest API ${res.status}: ${res.statusText}`);
    }
    return JSON.parse(body) as T;
  }

  private async getText(path: string): Promise<string> {
    const res = await fetch(`${MOBILE_BASE}${path}`, {
      headers: { Authorization: this.authHeader },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`LambdaTest API ${res.status}: ${res.statusText}`);
    }
    return text;
  }

  async getBuildSessions(buildId: string): Promise<LTSession[]> {
    // Returns sessions with status for a given build
    const resp = await this.get<LTBuildSessionsResponse>(`/sessions?build_id=${buildId}&limit=200`);
    return resp?.data?.data ?? [];
  }

  async getSession(sessionId: string): Promise<LTSessionDetail> {
    const resp = await this.get<LTSessionResponse>(`/sessions/${sessionId}`);
    return resp.data;
  }

  async getSessionLog(sessionId: string): Promise<string> {
    return this.getText(`/sessions/${sessionId}/log/instrumentation`);
  }
}
