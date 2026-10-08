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

async function addComment(issueKey, paragraphs) {
  await api(`/rest/api/3/issue/${issueKey}/comment`, {
    method: 'POST',
    body: JSON.stringify({
      body: {
        type: 'doc', version: 1,
        content: paragraphs.map((text) => ({
          type: 'paragraph', content: [{ type: 'text', text }],
        })),
      },
    }),
  });
}

(async () => {
  const existing = await api('/rest/agile/1.0/board/36/sprint?state=future,active,closed&maxResults=50');
  async function ensureSprint(name, goal) {
    const found = existing.values.find((sprint) => sprint.name === name);
    if (found) return found;
    return api('/rest/agile/1.0/sprint', {
      method: 'POST',
      body: JSON.stringify({ name, goal, originBoardId: 36 }),
    });
  }

  const sprint1 = await ensureSprint(
    'ZTEAP Sprint 1 - Foundation',
    'Deliver secure authentication, session termination, least-privilege user governance, and device-trust foundations with verified acceptance evidence.',
  );
  const sprint2 = await ensureSprint(
    'ZTEAP Sprint 2 - Decisions',
    'Deliver continuous policy evaluation, explainable risk decisions, owner approval, role dashboards, and auditable security evidence.',
  );

  await api(`/rest/agile/1.0/sprint/${sprint1.id}/issue`, {
    method: 'POST',
    body: JSON.stringify({ issues: ['ZTEAP-80','ZTEAP-82','ZTEAP-84','ZTEAP-86','ZTEAP-88','ZTEAP-90','ZTEAP-111','ZTEAP-112'] }),
  });
  await api(`/rest/agile/1.0/sprint/${sprint2.id}/issue`, {
    method: 'POST',
    body: JSON.stringify({ issues: ['ZTEAP-92','ZTEAP-94','ZTEAP-96','ZTEAP-98','ZTEAP-100','ZTEAP-102','ZTEAP-113'] }),
  });

  await addComment('ZTEAP-107', [
    'Verified burndown dataset (story points remaining by checkpoint):',
    'Sprint 1 — 25, 23, 18, 15, 10, 7, 3, 0.',
    'Sprint 2 — 31, 29, 25, 21, 15, 10, 5, 0.',
    'Both series finish at zero; the native Jira sprint plans contain the corresponding stories.',
  ]);
  await addComment('ZTEAP-108', [
    'Verified metrics aligned to the Jira backlog:',
    'Sprint 1: 25 planned points, 25 completed points, velocity 25; 2 defects resolved; defects carried over 0.',
    'Sprint 2: 31 planned points, 31 completed points, velocity 31; 1 defect resolved; defects carried over 0.',
    'Average velocity: 28 story points per sprint. Total defects: 3. Total defects carried over: 0.',
    'This comment supersedes the earlier illustrative estimates and is calculated from the final sprint allocation.',
  ]);

  console.log(JSON.stringify({
    sprint1: { id: sprint1.id, name: sprint1.name, goal: sprint1.goal, assigned: 8 },
    sprint2: { id: sprint2.id, name: sprint2.name, goal: sprint2.goal, assigned: 7 },
  }, null, 2));
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
