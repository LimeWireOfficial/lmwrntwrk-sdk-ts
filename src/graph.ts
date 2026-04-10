import { DefaultGraphEndpoint } from "./constants.js";

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any> | undefined;
}

export interface GraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}

interface gqlValidator {
  endpointUrl: string;
}

export class GraphQLClient {
  private url: string;
  private bearer: string | undefined;

  constructor(url?: string, bearer?: string) {
    this.url = url || DefaultGraphEndpoint;
    this.bearer = bearer;
  }

  async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const reqBody: GraphQLRequest = {
      query,
      variables,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.bearer) {
      headers["Authorization"] = `Bearer ${this.bearer}`;
    }

    const response = await fetch(this.url, {
      method: "POST",
      headers,
      body: JSON.stringify(reqBody),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GraphQL request failed (${response.status}): ${body}`);
    }

    const gqlResp: GraphQLResponse<T> = await response.json();

    if (gqlResp.errors && gqlResp.errors.length > 0) {
      throw new Error(`GraphQL errors: ${JSON.stringify(gqlResp.errors)}`);
    }

    return gqlResp.data;
  }

  async listEnabledValidatorEndpoints(): Promise<string[]> {
    const query = `
      query GetValidators {
        validators(first: 3, where: {status: ENABLED}) {
          endpointUrl
        }
      }
    `;

    const result = await this.query<{ validators: gqlValidator[] }>(query);

    if (!result.validators || result.validators.length === 0) {
      throw new Error("no active validator found");
    }

    return result.validators.map((v) => v.endpointUrl);
  }
}
