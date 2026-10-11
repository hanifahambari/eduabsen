export interface VercelRequest {
  method: string;
  query: Record<string, string | string[] | undefined>;
  body: any;
  headers: Record<string, string | string[] | undefined>;
}

export interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => VercelResponse;
  send: (data: string) => VercelResponse;
  setHeader: (name: string, value: string) => VercelResponse;
}

export function createResponse(): VercelResponse {
  let statusCode = 200;
  const headers: Record<string, string> = {};
  let body: any = null;

  const res: VercelResponse = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { body = data; return res; },
    send: (data) => { body = data; return res; },
    setHeader: (name, value) => { headers[name] = value; return res; },
  };
  return res;
}
