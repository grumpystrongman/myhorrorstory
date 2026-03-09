const LINEAR_API_URL = 'https://api.linear.app/graphql';

function resolveAuthorizationHeader(tokenOrKey) {
  const normalized = tokenOrKey.trim();
  if (normalized.toLowerCase().startsWith('bearer ')) {
    return normalized;
  }
  if (normalized.toLowerCase().startsWith('basic ')) {
    return normalized;
  }
  return `Bearer ${normalized}`;
}

export class LinearClient {
  constructor(accessTokenOrApiKey) {
    if (!accessTokenOrApiKey) {
      throw new Error('Linear access token or API key is required.');
    }
    this.authorizationHeader = resolveAuthorizationHeader(accessTokenOrApiKey);
  }

  async request(query, variables = {}) {
    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authorizationHeader
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Linear API error (${response.status}): ${text}`);
    }

    const payload = await response.json();
    if (payload.errors?.length) {
      throw new Error(`Linear GraphQL error: ${payload.errors[0].message}`);
    }

    return payload.data;
  }

  async getViewer() {
    const data = await this.request(
      `
      query Viewer {
        viewer {
          id
          name
          email
        }
      }
      `
    );
    return data.viewer;
  }

  async getTeamByKey(teamKey) {
    const data = await this.request(
      `
      query TeamByKey($teamKey: String!) {
        teams(first: 1, filter: { key: { eq: $teamKey } }) {
          nodes {
            id
            key
            name
            labels(first: 250) {
              nodes {
                id
                name
              }
            }
          }
        }
      }
      `,
      { teamKey }
    );
    return data.teams?.nodes?.[0] ?? null;
  }

  async listIssues({
    teamId,
    first = 200,
    includeCompleted = false,
    includeCanceled = true,
    assigneeId = null,
    stateTypes = null
  }) {
    const filter = {
      team: {
        id: {
          eq: teamId
        }
      },
      ...(assigneeId
        ? {
            assignee: {
              id: {
                eq: assigneeId
              }
            }
          }
        : {}),
      ...(includeCompleted
        ? {}
        : {
            state: {
              type: {
                neq: 'completed'
              }
            }
          })
    };

    const data = await this.request(
      `
      query Issues($first: Int!, $filter: IssueFilter) {
        issues(first: $first, filter: $filter) {
          nodes {
            id
            identifier
            title
            description
            url
            priority
            createdAt
            updatedAt
            labels {
              nodes {
                id
                name
              }
            }
            state {
              id
              name
              type
            }
            assignee {
              id
              name
              email
            }
          }
        }
      }
      `,
      {
        first,
        filter
      }
    );

    const issues = data.issues.nodes.map((issue) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description ?? '',
      url: issue.url,
      priority: issue.priority ?? 0,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      labelIds: issue.labels.nodes.map((label) => label.id),
      labels: issue.labels.nodes.map((label) => label.name),
      stateId: issue.state?.id ?? null,
      stateName: issue.state?.name ?? 'Unknown',
      stateType: issue.state?.type ?? 'unknown',
      assigneeId: issue.assignee?.id ?? null,
      assigneeEmail: issue.assignee?.email ?? null
    }));

    return issues.filter((issue) => {
      if (!includeCanceled && issue.stateType === 'canceled') {
        return false;
      }
      if (Array.isArray(stateTypes) && stateTypes.length > 0 && !stateTypes.includes(issue.stateType)) {
        return false;
      }
      return true;
    });
  }

  async updateIssueLabels(issueId, labelIds) {
    const data = await this.request(
      `
      mutation UpdateIssueLabels($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
          }
        }
      }
      `,
      {
        id: issueId,
        input: {
          labelIds
        }
      }
    );

    if (!data.issueUpdate.success) {
      throw new Error(`Failed to update labels for issue id: ${issueId}`);
    }

    return data.issueUpdate.issue;
  }

  async createIssue({ teamId, title, description, labelIds, priority = 2 }) {
    const data = await this.request(
      `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            url
          }
        }
      }
      `,
      {
        input: {
          teamId,
          title,
          description,
          priority,
          labelIds
        }
      }
    );

    if (!data.issueCreate.success) {
      throw new Error(`Failed to create issue: ${title}`);
    }

    return data.issueCreate.issue;
  }

  async addCommentToIssue(issueId, body) {
    const data = await this.request(
      `
      mutation CommentCreate($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment {
            id
          }
        }
      }
      `,
      {
        input: {
          issueId,
          body
        }
      }
    );

    return data.commentCreate.success === true;
  }

  async listWorkflowStates(teamId) {
    const data = await this.request(
      `
      query WorkflowStates($teamId: ID!) {
        workflowStates(first: 250, filter: { team: { id: { eq: $teamId } } }) {
          nodes {
            id
            name
            type
          }
        }
      }
      `,
      { teamId }
    );

    return data.workflowStates.nodes.map((state) => ({
      id: state.id,
      name: state.name,
      type: state.type
    }));
  }

  async updateIssue(issueId, input) {
    const data = await this.request(
      `
      mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
          }
        }
      }
      `,
      {
        id: issueId,
        input
      }
    );

    if (!data.issueUpdate.success) {
      throw new Error(`Failed to update issue: ${issueId}`);
    }

    return data.issueUpdate.issue;
  }

  async updateIssueState(issueId, stateId) {
    return this.updateIssue(issueId, {
      stateId
    });
  }
}
