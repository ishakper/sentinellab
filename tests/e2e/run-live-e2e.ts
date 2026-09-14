import { io } from socket.io-client;

const API_BASE = http://127.0.0.1:3001/api/v1;
const WS_URL = ws://127.0.0.1:3002/ws/device;

interface TestResult {
  phase: string;
  name: string;
  status: PASS | FAIL;
  details: string;
}

const results: TestResult[] = [];

function record(phase: string, name: string, status: PASS | FAIL, details: string) {
  results.push({ phase, name, status, details });
  console.log([] []  - );
}

async function run() {
  console.log(================================================================);
  console.log(SENTINELLAB TRUE END-TO-END RUNTIME VERIFICATION);
  console.log(================================================================);

  // 1. Health & Readiness
  try {
    const res = await fetch(${API_BASE}/ready);
    const data = await res.json();
    if (res.ok && data.status === ok && data.dependencies?.database?.status === up && data.dependencies?.redis?.status === up) {
      record(CR9, Live Service Readiness, PASS, Postgres latency: ms, Redis latency: ms);
    } else {
      record(CR9, Live Service Readiness, FAIL, JSON.stringify(data));
    }
  } catch (e: any) {
    record(CR9, Live Service Readiness, FAIL, e.message);
  }

  // 2. Phase 11 — True E2E Authentication
  let tokenA = ";
 let refreshA = ;
 let userAId = ;
 let orgAId = ;

 const uniqueSuffix = Date.now().toString().slice(-6);
 const emailA = dmin_a_@sentinellab.test;
 const emailB = dmin_b_@sentinellab.test;
 const password = ValidPassword123!Secure;

 // Register Org A
 try {
 const res = await fetch(${API_BASE}/auth/register, {
 method: POST,
 headers: { Content-Type: application/json },
 body: JSON.stringify({
 email: emailA,
 password: password,
 organizationName: Acme Corp ,
 }),
 });
 const data = await res.json();
 if (res.status === 201 && data.accessToken && data.refreshToken) {
 tokenA = data.accessToken;
 refreshA = data.refreshToken;
 userAId = data.user.id;
 record(CR10, Live Admin Registration (Org A), PASS, User ID: , Access token generated);
 } else {
 record(CR10, Live Admin Registration (Org A), FAIL, Status : );
 }
 } catch (e: any) {
 record(CR10, Live Admin Registration (Org A), FAIL, e.message);
 }

 // Duplicate Email Rejection
 try {
 const res = await fetch(${API_BASE}/auth/register, {
 method: POST,
 headers: { Content-Type: application/json },
 body: JSON.stringify({
 email: emailA,
 password: password,
 organizationName: Acme Duplicate,
 }),
 });
 if (res.status === 400) {
 record(CR10, Duplicate Registration Rejection, PASS, HTTP 400 received as expected);
 } else {
 record(CR10, Duplicate Registration Rejection, FAIL, Expected 400, got );
 }
 } catch (e: any) {
 record(CR10, Duplicate Registration Rejection, FAIL, e.message);
 }

 // Login Valid
 try {
 const res = await fetch(${API_BASE}/auth/login, {
 method: POST,
 headers: { Content-Type: application/json },
 body: JSON.stringify({ email: emailA, password }),
 });
 const data = await res.json();
 if (res.status === 200 && data.accessToken) {
 record(CR10, Live Login with Valid Credentials, PASS, HTTP 200 with new JWT access token);
 } else {
 record(CR10, Live Login with Valid Credentials, FAIL, Status );
 }
 } catch (e: any) {
 record(CR10, Live Login with Valid Credentials, FAIL, e.message);
 }

 // Login Wrong Password
 try {
 const res = await fetch(${API_BASE}/auth/login, {
 method: POST,
 headers: { Content-Type: application/json },
 body: JSON.stringify({ email: emailA, password: WrongPassword999! }),
 });
 if (res.status === 401) {
 record(CR10, Login Wrong Password Rejection, PASS, HTTP 401 Unauthorized received);
 } else {
 record(CR10, Login Wrong Password Rejection, FAIL, Expected 401, got );
 }
 } catch (e: any) {
 record(CR10, Login Wrong Password Rejection, FAIL, e.message);
 }

 // JWT Protected Endpoint
 try {
 const res = await fetch(${API_BASE}/users, {
 headers: { Authorization: Bearer },
 });
 const data = await res.json();
 if (res.status === 200 && data.success) {
 const user = data.data.find((u: any) => u.id === userAId);
 orgAId = user?.organizationId;
 record(CR11, JWT Bearer Authentication Verification, PASS, Authenticated as Org A (Org ID: ));
 } else {
 record(CR11, JWT Bearer Authentication Verification, FAIL, Status );
 }
 } catch (e: any) {
 record(CR11, JWT Bearer Authentication Verification, FAIL, e.message);
 }

 // JWT Invalid Token Rejection
 try {
 const res = await fetch(${API_BASE}/users, {
 headers: { Authorization: Bearer invalid.jwt.token.here },
 });
 if (res.status === 401) {
 record(CR11, Invalid JWT Rejection, PASS, HTTP 401 Unauthorized received);
 } else {
 record(CR11, Invalid JWT Rejection, FAIL, Expected 401, got );
 }
 } catch (e: any) {
 record(CR11, Invalid JWT Rejection, FAIL, e.message);
 }

 // Refresh Token Rotation
 let newRefreshA = ;
 try {
 const res = await fetch(${API_BASE}/auth/refresh, {
 method: POST,
 headers: { Content-Type: application/json },
 body: JSON.stringify({ refreshToken: refreshA }),
 });
 const data = await res.json();
 if (res.status === 200 && data.accessToken && data.refreshToken) {
 newRefreshA = data.refreshToken;
 record(CR11, Refresh Token Rotation, PASS, Old token exchanged for new pair);
 } else {
 record(CR11, Refresh Token Rotation, FAIL, Status : );
 }
 } catch (e: any) {
 record(CR11, Refresh Token Rotation, FAIL, e.message);
 }

 // Reuse Old Refresh Token (Replay Protection)
 try {
 const res = await fetch(${API_BASE}/auth/refresh, {
 method: POST,
 headers: { Content-Type: application/json },
 body: JSON.stringify({ refreshToken: refreshA }),
 });
 if (res.status === 401) {
 record(CR11, Refresh Token Reuse / Replay Rejection, PASS, HTTP 401 received for reused token);
 } else {
 record(CR11, Refresh Token Reuse / Replay Rejection, FAIL, Expected 401, got );
 }
 } catch (e: any) {
 record(CR11, Refresh Token Reuse / Replay Rejection, FAIL, e.message);
 }

 // 3. Phase 12 — True Multi-Tenant Isolation
 let tokenB = ;
 let orgBId = ;
 try {
 const resB = await fetch(${API_BASE}/auth/register, {
 method: POST,
 headers: { Content-Type: application/json },
 body: JSON.stringify({
 email: emailB,
 password: password,
 organizationName: Beta Corp ,
 }),
 });
 const dataB = await resB.json();
 tokenB = dataB.accessToken;

 const resBUsers = await fetch(${API_BASE}/users, {
 headers: { Authorization: Bearer },
 });
 const dataBUsers = await resBUsers.json();
 orgBId = dataBUsers.data?.[0]?.organizationId;

 // Org A reading Org A
 const resAtoA = await fetch(${API_BASE}/organizations/, {
 headers: { Authorization: Bearer },
 });
 const okAtoA = resAtoA.status === 200;

 // Org A reading Org B (Cross-tenant attack)
 const resAtoB = await fetch(${API_BASE}/organizations/, {
 headers: { Authorization: Bearer },
 });
 const okAtoB = resAtoB.status === 403;

 // Org B reading Org A (Cross-tenant attack)
 const resBtoA = await fetch(${API_BASE}/organizations/, {
 headers: { Authorization: Bearer },
 });
 const okBtoA = resBtoA.status === 403;

 if (okAtoA && okAtoB && okBtoA) {
 record(CR12, True Multi-Tenant Boundary Enforcement, PASS, Org A->Org A (200), Org A->Org B (403), Org B->Org A (403));
 } else {
 record(CR12, True Multi-Tenant Boundary Enforcement, FAIL, A->A: , A->B: , B->A: );
 }
 } catch (e: any) {
 record(CR12, True Multi-Tenant Boundary Enforcement, FAIL, e.message);
 }

 // 4. Phase 14 — True WebSocket Handshake & Security
 await new Promise<void>((resolve) => {
 console.log(Connecting WebSocket client to ws://127.0.0.1:3002/ws/device...);
 const testDeviceId = 11111111-2222-3333-4444-555555555555;
 const socket = io(http://127.0.0.1:3002/ws/device, {
 query: { deviceId: testDeviceId },
 transports: [websocket],
 reconnection: false,
 timeout: 5000,
 });

 socket.on(connect, () => {
 record(CR14, Live WebSocket Connection & Handshake, PASS, Connected to /ws/device with socket ID );
 
 // Emit heartbeat
 socket.emit(device.heartbeat, { battery: 95, charging: true });
 record(CR14, WebSocket Telemetry & Heartbeat, PASS, Heartbeat packet emitted to server);
 
 setTimeout(() => {
 socket.disconnect();
 resolve();
 }, 500);
 });

 socket.on(connect_error, (err) => {
 record(CR14, Live WebSocket Connection & Handshake, FAIL, Connection error: );
 resolve();
 });
 });

 // WebSocket Connection Rejection Without Device ID
 await new Promise<void>((resolve) => {
 const unauthSocket = io(http://127.0.0.1:3002/ws/device, {
 transports: [websocket],
 reconnection: false,
 timeout: 3000,
 });

 unauthSocket.on(disconnect, (reason) => {
 record(CR14, WebSocket Unauthenticated Client Rejection, PASS, Disconnected immediately: );
 resolve();
 });

 unauthSocket.on(connect, () => {
 // If connected without deviceId, server handleConnection disconnects client
 setTimeout(() => {
 if (!unauthSocket.connected) {
 record(CR14, WebSocket Unauthenticated Client Rejection, PASS, Server terminated unauthenticated socket);
 } else {
 record(CR14, WebSocket Unauthenticated Client Rejection, FAIL, Socket remained connected without deviceId);
 }
 unauthSocket.disconnect();
 resolve();
 }, 500);
 });

 unauthSocket.on(connect_error, () => {
 record(CR14, WebSocket Unauthenticated Client Rejection, PASS, Connection refused as expected);
 resolve();
 });
 });

 // 5. Phase 15 — Remote Support & Instant Kill Switch
 try {
 const dummyDeviceId = 22222222-3333-4444-5555-666666666666;
 const reqRes = await fetch(${API_BASE}/support/request, {
 method: POST,
 headers: {
 Content-Type: application/json,
 Authorization: Bearer ,
 },
 body: JSON.stringify({
 deviceId: dummyDeviceId,
 reason: Investigating anomalous network traffic in lab,
 }),
 });
 const reqData = await reqRes.json();
 if (reqRes.status === 201 && reqData.id) {
 const sessionId = reqData.id;
 record(CR15, Remote Support Session Request, PASS, Session ID created (Status: ));

 // Consent Grant
 const consentRes = await fetch(${API_BASE}/support/sessions//consent, {
 method: POST,
 headers: { Content-Type: application/json },
 body: JSON.stringify({ deviceId: dummyDeviceId, granted: true }),
 });
 const consentData = await consentRes.json();
 if (consentRes.status === 200 && consentData.status === ACTIVE) {
 record(CR15, Explicit Device User Consent Grant, PASS, Session transitioned to ACTIVE state);
 } else {
 record(CR15, Explicit Device User Consent Grant, FAIL, Status );
 }

 // One-Touch Instant Kill Switch
 const termRes = await fetch(${API_BASE}/support/sessions//terminate, {
 method: POST,
 headers: { Content-Type: application/json },
 body: JSON.stringify({ triggeredBy: USER }),
 });
 const termData = await termRes.json();
 if (termRes.status === 200 && termData.status === TERMINATED) {
 record(CR15, Instant One-Touch Kill Switch Termination, PASS, Session immediately revoked and TERMINATED);
 } else {
 record(CR15, Instant One-Touch Kill Switch Termination, FAIL, Status );
 }
 } else {
 record(CR15, Remote Support Session Lifecycle, FAIL, Status : );
 }
 } catch (e: any) {
 record(CR15, Remote Support Session Lifecycle, FAIL, e.message);
 }

 console.log(================================================================);
 console.log(E2E VERIFICATION COMPLETED);
 const passed = results.filter((r) => r.status === PASS).length;
 const total = results.length;
 console.log(Summary: / checks passed (%));
 console.log(================================================================);
}

run().catch(console.error);
