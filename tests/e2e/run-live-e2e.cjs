const { io } = require('socket.io-client');

const API_BASE = 'http://127.0.0.1:3001/api/v1';
const WS_URL = 'http://127.0.0.1:3002/ws/device';

const results = [];

function record(phase, name, status, details) {
  results.push({ phase, name, status, details });
  console.log('[' + status + '] [' + phase + '] ' + name + ' - ' + details);
}

async function run() {
  console.log('================================================================');
  console.log('SENTINELLAB TRUE END-TO-END RUNTIME VERIFICATIONE');
  console.log('===============================================================');

  // 1. Live Readiness Check
  try {
    const res = await fetch(API_BASE + '/ready');
    const data = await res.json();
    if (res.ok && data.status === 'pk' && data.dependencies?.database?.status === 'up' && data.dependencies?.redis?.status === 'up') {
      record('CR9', 'Live Service Readiness', 'PASS', 'Postgres latency: ' + data.dependencies.database.latencyMs + 'ms, Redis latency: ' + data.dependencies.redis.latencyMs + 'ms');
    } else {
      record('CR9', 'Live Service Readiness', 'FAIL', JSON.stringify(data));
    }
  } catch (e) {
    record('CR9', 'Live Service Readiness', 'FAIL', e.message);
  }

  // 2. Authentication & JWT & Refresh Token Rotation
  let tokenA = '';
  let refreshA = '';
  let userAId = '';
  let orgAId = '';

  const uniqueSuffix = Date.now().toString().slice(-6);
  const emailA = 'admin_a_' + uniqueSuffix + '@sentinellab.test';
  const emailB = 'admin_b_' + uniqueSuffix + '@sentinellab.test';
  const password = 'ValidPassword123!Secure';

  // Register Org A
  try {
    const res = await fetch(API_BASE + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: password,
        organizationName: 'Acme Corp ' + uniqueSuffix,
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.accessToken && data.refreshToken) {
      tokenA = data.accessToken;
      refreshA = data.refreshToken;
      userAId = data.user.id;
      record('CR10', 'Live Admin Registration (Org A)', 'PASS', 'User ID: ' + userAId + ', JWT generated');
    } else {
      record('CR10', 'Live Admin Registration (Org A)', 'FAIL', 'Status ' + res.status + ': ' + JSON.stringify(data));
    }
  } catch (e) {
    record('CR10', 'Live Admin Registration (Org A)', 'FAIL', e.message);
  }

  // Duplicate Registration Rejection
  try {
    const res = await fetch(API_BASE + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: password,
        organizationName: 'Acme Duplicate',
      }),
    });
    if (res.status === 400) {
      record('CR10', 'Duplicate Registration Rejection', 'PASS', 'HTTP 400 received as expected');
    } else {
      record('CR10', 'Duplicate Registration Rejection', 'FAIL', 'Expected 400, got ' + res.status);
    }
  } catch (e) {
    record('CR10', 'Duplicate Registration Rejection', 'FAIL', e.message);
  }

  // Login Valid
  try {
    const res = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password }),
    });
    const data = await res.json();
    if (res.status === 200 && data.accessToken) {
      record('CR10', 'Live Login with Valid Credentials', 'PASS', 'HTTP 200 with new JWT access token');
    } else {
      record('CR10', 'Live Login with Valid Credentials', 'FAIL', 'Status ' + res.status);
    }
  } catch (e) {
    record('CR10', 'Live Login with Valid Credentials', 'FAIL', e.message);
  }

  // Login Wrong Password
  try {
    const res = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password: 'WrongPassword999!' }),
    });
    if (res.status === 401) {
      record('CR10', 'Login Wrong Password Rejection', 'PASS', 'HTTP 401 Unauthorized received');
    } else {
      record('CR10', 'Login Wrong Password Rejection', 'FAIL', 'Expected 401, got ' + res.status);
    }
  } catch (e) {
    record('CR10', 'Login Wrong Password Rejection', 'FAIL', e.message);
  }

  // JWT Protected Endpoint Access
  try {
    const res = await fetch(API_BASE + '/users', {
      headers: { Authorization: 'Bearer ' + tokenA },
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      const user = data.data.find(u => u.id === userAId);
      orgAId = user?.organizationId;
      record('CR11', 'JWT Bearer Authentication Verification', 'PASS', 'Authenticated as Org A (Org ID: ' + orgAId + ')');
    } else {
      record('CR11', 'JWT Bearer Authentication Verification', 'FAIL', 'Status ' + res.status);
    }
  } catch (e) {
    record('CR11', 'JWT Bearer Authentication Verification', 'FAIL', e.message);
  }

  // Invalid JWT Rejection
  try {
    const res = await fetch(API_BASE + '/users', {
      headers: { Authorization: 'Bearer invalid.jwt.token.here' },
    });
    if (res.status === 401) {
      record('CR11', 'Invalid JWT Rejection', 'PASS', 'HTTP 401 Unauthorized received');
    } else {
      record('CR11', 'Invalid JWT Rejection', 'FAIL', 'Expected 401, got ' + res.status);
    }
  } catch (e) {
    record('CR11', 'Invalid JWT Rejection', 'FAIL', e.message);
  }

  // Refresh Token Rotation
  let newRefreshA = '';
  try {
    const res = await fetch(API_BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshA }),
    });
    const data = await res.json();
    if (res.status === 200 && data.accessToken && data.refreshToken) {
      newRefreshA = data.refreshToken;
      record('CR11', 'Refresh Token Rotation', 'PASS', 'Old token exchanged for new pair');
    } else {
      record('CR11', 'Refresh Token Rotation', 'FAIL', 'Status ' + res.status + ': ' + JSON.stringify(data));
    }
  } catch (e) {
    record('CR11', 'Refresh Token Rotation', 'FAIL', e.message);
  }

  // Reuse Old Refresh Token (Replay Protection)
  try {
    const res = await fetch(API_BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshA }),
    });
    if (res.status === 401) {
      record('CR11', 'Refresh Token Reuse / Replay Rejection', 'PASS', 'HTTP 401 received for reused token');
    } else {
      record('CR11', 'Refresh Token Reuse / Replay Rejection', 'FAIL', 'Expected 401, got ' + res.status);
    }
  } catch (e) {
    record('CR11', 'Refresh Token Reuse / Replay Rejection', 'FAIL', e.message);
  }

  // 3. True Multi-Tenant Isolation
  let tokenB = '';
  let orgBId = '';
  try {
    const resB = await fetch(API_BASE + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailB,
        password: password,
        organizationName: 'Beta Corp ' + uniqueSuffix,
      }),
    });
    const dataB = await resB.json();
    tokenB = dataB.accessToken;

    const resBUsers = await fetch(API_BASE + '/users', {
      headers: { Authorization: 'Bearer ' + tokenB },
    });
    const dataBUsers = await resBUsers.json();
    orgBId = dataBUsers.data?K�O˛ܙ�[�^�][ےY���ܙ�H�XY[��ܙ�B��ۜ��\�]�HH]�Z]�]�
TWАT�H
�	��ܙ�[�^�][ۜ���
�ܙ�RYXY\�Έ�]]ܚ^�][ێ�	ЙX\�\�	�
���[�HK�JN�ۜ���]�HH�\�]�K��]\�OOH����ܙ�H�XY[��ܙ��
ܛ���][�[�]X��B��ۜ��\�]ЈH]�Z]�]�
TWАT�H
�	��ܙ�[�^�][ۜ���
�ܙВYXY\�Έ�]]ܚ^�][ێ�	ЙX\�\�	�
���[�HK�JN�ۜ���]ЈH�\�]Ћ��]\�OOH����ܙ���XY[��ܙ�H
ܛ���][�[�]X��B��ۜ��\Н�HH]�Z]�]�
TWАT�H
�	��ܙ�[�^�][ۜ���
�ܙ�RYXY\�Έ�]]ܚ^�][ێ�	ЙX\�\�	�
���[��K�JN�ۜ��Н�HH�\Н�K��]\�OOH��Y�
��]�H	����]Ј	���Н�JH�X�ܙ
	�ԌL��	��YH][KU[�[���[�\�H[��ܘ�[Y[�	�	�T��	�	�ܙ�KO�ܙ�H
�
Kܙ�KO�ܙ��
�Kܙ��O�ܙ�H
�I�NH[�H�X�ܙ
	�ԌL��	��YH][KU[�[���[�\�H[��ܘ�[Y[�	�	ѐRS	�	�KO�N�	�
��\�]�K��]\�
�	�KO���	�
��\�]Ћ��]\�
�	��O�N�	�
��\Н�K��]\�NB�H�]�
JH�X�ܙ
	�ԌL��	��YH][KU[�[���[�\�H[��ܘ�[Y[�	�	ѐRS	�K�Y\��Y�JNB������YH�X�����][��Z�H	��X�\�]B�]�Z]�]���Z\�J
�\���JHO��ۜ�\�]�X�RYH	�LLLLLLLKL����L����MMMMMMMMMMMMMI��ۜ�����]H[����T�]Y\�N��]�X�RY�\�]�X�RYK��[��ܝΈ���X�����]	�K��X�ۛ�X�[ێ��[�K�[Y[�]�L�JN�����]�ۊ	��ۛ�X�	�

HO��X�ܙ
	�ԌM	�	�]�H�X�����]�ۛ�X�[ۈ	�[��Z�I�	�T���	��ۛ�X�Y�����]�X�H�]����]Q	�
�����]�Y
N�����]�[Z]
	�]�X�K�X\��X]	���]\�N�MK�\��[�Έ�YHJN�X�ܙ
	�ԌM	�	��X�����][[Y]�H	�X\��X]	�	�T���	�X\��X]X��][Z]Y��\��\��N��][Y[�]


HO�����]�\��ۛ�X�

N�\���J
NKL
NJN�����]�ۊ	��ۛ�X��\��܉�
\��HO��X�ܙ
	�ԌM	�	�]�H�X�����]�ۛ�X�[ۈ	�[��Z�I�	ѐRS	�	��ۛ�X�[ۈ\��܎�	�
�\���Y\��Y�JN�\���J
NJNJN����X�����]�ۛ�X�[ۈ�Z�X�[ۈ�]�]]�X�HQ�]�Z]�]���Z\�J
�\���JHO��ۜ�[�]]����]H[����T��[��ܝΈ���X�����]	�K��X�ۛ�X�[ێ��[�K�[Y[�]���JN�[�]]����]�ۊ	�\��ۛ�X�	�
�X\�ۊHO��X�ܙ
	�ԌM	�	��X�����][�]][�X�]Y�Y[��Z�X�[ۉ�	�T��	�	�\��ۛ�X�Y[[YYX][N�	�
��X\�ۊN�\���J
NJN�[�]]����]�ۊ	��ۛ�X�	�

HO��][Y[�]


HO�Y�
][�]]����]��ۛ�X�Y
H�X�ܙ
	�ԌM	�	��X�����][�]][�X�]Y�Y[��Z�X�[ۉ�	�T��	�	��\��\�\�Z[�]Y[�]][�X�]Y����]	�NH[�H�X�ܙ
	�ԌM	�	��X�����][�]][�X�]Y�Y[��Z�X�[ۉ�	ѐRS	�	�����]�[XZ[�Y�ۛ�X�Y�]�]]�X�RY	�NB�[�]]����]�\��ۛ�X�

N�\���J
NKL
NJN�[�]]����]�ۊ	��ۛ�X��\��܉�

HO��X�ܙ
	�ԌM	�	��X�����][�]][�X�]Y�Y[��Z�X�[ۉ�	�T���	��ۛ�X�[ۈ�Y�\�Y\�^X�Y	�N�\���J
NJNJN���K��[[�H�\ܝ	�[��[��[��]���H�ۜ�[[^Q]�X�RYH	̌�������L����MMMMMKM��������������ۜ��\T�\�H]�Z]�]�
TWАT�H
�	���\ܝܙ\]Y\�	�Y]��	���	��XY\�Έ	��۝[�U\IΈ	�\X�][ۋڜ�ۉ��]]ܚ^�][ێ�	ЙX\�\�	�
���[�K�K���N���Ӌ���[��Y�J]�X�RY�[[^Q]�X�RY��X\�ێ�	�[��\�Y�][��[��X[�\��]�ܚ��Y��X�[�X���JK�JN�ۜ��\Q]HH]�Z]�\T�\˚��ۊ
NY�
�\T�\˜�]\�OOH�H	���\Q]K�Y
H�ۜ��\��[ےYH�\Q]K�Y�X�ܙ
	�ԌMI�	ԙ[[�H�\ܝ�\��[ۈ�\]Y\�	�	�T���	��\��[ۈQ	�
��\��[ےY
�	�ܙX]Y
�]\Έ	�
��\Q]K��]\�
�	�I�N����ۜ�[�ܘ[���ۜ��ۜ�[��\�H]�Z]�]�
TWАT�H
�	���\ܝ��\��[ۜ���
��\��[ےY
�	���ۜ�[�	�Y]��	���	��XY\�Έ�	��۝[�U\IΈ	�\X�][ۋڜ�ۉ�K���N���Ӌ���[��Y�J�]�X�RY�[[^Q]�X�RYܘ[�Y��YHJK�JN�ۜ��ۜ�[�]HH]�Z]�ۜ�[��\˚��ۊ
NY�
�ۜ�[��\˜�]\�OOH�	���ۜ�[�]K��]\�OOH	�P�U�I�H�X�ܙ
	�ԌMI�	�^X�]]�X�H\�\��ۜ�[�ܘ[�	�	�T���	��\��[ۈ�[��][ۙY�P�U�H�]I�NH[�H�X�ܙ
	�ԌMI�	�^X�]]�X�H\�\��ۜ�[�ܘ[�	�	ѐRS	�	��]\�	�
��ۜ�[��\˜�]\�NB����[��[�ۙKU�X��[��]���ۜ�\�T�\�H]�Z]�]�
TWАT�H
�	���\ܝ��\��[ۜ���
��\��[ےY
�	��\�Z[�]I�Y]��	���	��XY\�Έ�	��۝[�U\IΈ	�\X�][ۋڜ�ۉ�K���N���Ӌ���[��Y�J��Y��\�Y�N�	�T�T��JK�JN�ۜ�\�Q]HH]�Z]\�T�\˚��ۊ
NY�
\�T�\˜�]\�OOH�	��\�Q]K��]\�OOH	�T�RS�UQ	�H�X�ܙ
	�ԌMI�	�[��[�ۙKU�X��[��]�\�Z[�][ۉ�	�T���	��\��[ۈ[[YYX][H�]���Y[�T�RS�UQ	�NH[�H�X�ܙ
	�ԌMI�	�[��[�ۙKU�X��[��]�\�Z[�][ۉ�	ѐRS	�	��]\�	�
�\�T�\˜�]\�NB�H[�H�X�ܙ
	�ԌMI�	ԙ[[�H�\ܝ�\��[ۈY�X�X�I�	ѐRS	�	��]\�	�
��\T�\˜�]\�
�	Έ	�
���Ӌ���[��Y�J�\Q]JJNB�H�]�
JH�X�ܙ
	�ԌMI�	ԙ[[�H�\ܝ�\��[ۈY�X�X�I�	ѐRS	�K�Y\��Y�JNB���ۜ��K���	�OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOI�N�ۜ��K���	�L�H�T�Q�P�USӈ��TUQ	�N�ۜ�\��YH�\�[˙�[\��O����]\�OOH	�T��˛[���ۜ��[H�\�[˛[���ۜ��K���	��[[X\�N�	�
�\��Y
�	���
��[
�	��X���\��Y
	�
�X]���[�

\��Y��[
H
�L
H
�	�JI�N�ۜ��K���	�OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOI�NB���[�
K��]�
�ۜ��K�\��܊N�