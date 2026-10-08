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

async function completeSprint(id, details) {
  let sprint = await api(`/rest/agile/1.0/sprint/${id}`);
  if (sprint.state === 'future') {
    sprint = await api(`/rest/agile/1.0/sprint/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...details, state: 'active' }),
    });
  }
  if (sprint.state === 'active') {
    sprint = await api(`/rest/agile/1.0/sprint/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...details, state: 'closed' }),
    });
  }
  return sprint;
}

(async () => {
  const sprint1 = await completeSprint(45, {
    name: 'ZTEAP Sprint 1 - Foundation',
    goal: 'Deliver secure authentication, session termination, least-privilege user governance, and device-trust foundations with verified acceptance evidence.',
    startDate: '2026-09-10T09:00:00.000+05:30',
    endDate: '2026-09-23T18:00:00.000+05:30',
  });
  const sprint2 = await completeSprint(46, {
    name: 'ZTEAP Sprint 2 - Decisions',
    goal: 'Deliver continuous policy evaluation, explainable risk decisions, owner approval, role dashboards, and auditable security evidence.',
    startDate: '2026-09-24T09:00:00.000+05:30',
    endDate: '2026-10-07T18:00:00.000+05:30',
  });
  console.log(JSON.stringify({ sprint1: sprint1.state, sprint2: sprint2.state }, null, 2));
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
