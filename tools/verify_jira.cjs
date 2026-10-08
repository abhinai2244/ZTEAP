const BASE = 'https://securesoft.atlassian.net';
const USER = process.env.JIRA_USER;
const TOKEN = process.env.JIRA_API_TOKEN;
if (!USER || !TOKEN) throw new Error('Missing Jira credentials');

const headers = {
  Authorization: `Basic ${Buffer.from(`${USER}:${TOKEN}`).toString('base64')}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

async function api(path, options = {}) {
  const response = await fetch(BASE + path, { ...options, headers });
  const raw = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${path}: ${raw}`);
  return raw ? JSON.parse(raw) : null;
}

(async () => {
  const [config, firstIssuePage, sprints] = await Promise.all([
    api('/rest/agile/1.0/board/36/configuration'),
    api('/rest/api/3/search/jql', {
      method: 'POST',
      body: JSON.stringify({
        jql: 'project = ZTEAP ORDER BY key ASC',
        fields: ['key', 'summary', 'status', 'issuetype', 'parent', 'priority', 'customfield_10016'],
        maxResults: 200,
      }),
    }),
    api('/rest/agile/1.0/board/36/sprint?state=future,active,closed&maxResults=50'),
  ]);

  const allIssues = [...firstIssuePage.issues];
  let nextPageToken = firstIssuePage.nextPageToken;
  while (nextPageToken) {
    const page = await api('/rest/api/3/search/jql', {
      method: 'POST',
      body: JSON.stringify({
        jql: 'project = ZTEAP ORDER BY key ASC',
        fields: ['key', 'summary', 'status', 'issuetype', 'parent', 'priority', 'customfield_10016'],
        maxResults: 200,
        nextPageToken,
      }),
    });
    allIssues.push(...page.issues);
    nextPageToken = page.nextPageToken;
  }

  const sprintDetails = [];
  for (const sprint of sprints.values) {
    const sprintIssues = await api(`/rest/agile/1.0/sprint/${sprint.id}/issue?maxResults=200&fields=key,summary,status,issuetype,customfield_10016`);
    sprintDetails.push({
      id: sprint.id,
      name: sprint.name,
      state: sprint.state,
      goal: sprint.goal,
      issueCount: sprintIssues.issues.length,
      storyPoints: sprintIssues.issues.reduce((sum, issue) => sum + (issue.fields.customfield_10016 || 0), 0),
      issues: sprintIssues.issues.map((issue) => ({ key: issue.key, type: issue.fields.issuetype.name, status: issue.fields.status.name })),
    });
  }

  const typeCounts = {};
  const statusCounts = {};
  for (const issue of allIssues) {
    typeCounts[issue.fields.issuetype.name] = (typeCounts[issue.fields.issuetype.name] || 0) + 1;
    statusCounts[issue.fields.status.name] = (statusCounts[issue.fields.status.name] || 0) + 1;
  }

  const phaseStatus = allIssues
    .filter((issue) => issue.fields.issuetype.name === 'Epic')
    .map((issue) => ({ key: issue.key, summary: issue.fields.summary, status: issue.fields.status.name }));
  const phase9Stories = allIssues.filter(
    (issue) => issue.fields.issuetype.name === 'Story' && issue.fields.parent?.key === 'ZTEAP-21',
  );
  const incomplete = allIssues
    .filter((issue) => issue.fields.status.name !== 'Done')
    .map((issue) => ({ key: issue.key, status: issue.fields.status.name, summary: issue.fields.summary }));

  console.log(JSON.stringify({
    boardColumns: config.columnConfig.columns.map((column) => ({
      name: column.name,
      statuses: column.statuses.map((status) => `${status.id}:${status.name}`),
    })),
    totalIssues: allIssues.length,
    typeCounts,
    statusCounts,
    phaseStatus,
    phase9StoryCount: phase9Stories.length,
    phase9StoryPoints: phase9Stories.reduce((sum, issue) => sum + (issue.fields.customfield_10016 || 0), 0),
    incomplete,
    sprints: sprintDetails,
  }, null, 2));
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
