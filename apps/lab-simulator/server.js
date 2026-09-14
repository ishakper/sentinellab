const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// Intentionally vulnerable endpoint (Hardcoded credentials)
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'supersecret123') {
        res.json({ token: 'admin_token_xyz', message: 'Logged in successfully' });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// Intentionally vulnerable endpoint (BOLA)
const users = {
    1: { id: 1, name: 'Alice', role: 'user', sensitiveData: 'User 1 private data' },
    2: { id: 2, name: 'Bob', role: 'admin', sensitiveData: 'Admin private data' }
};

app.get('/api/users/:id', (req, res) => {
    // No authorization check - BOLA vulnerability
    const userId = req.params.id;
    const user = users[userId];
    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// Intentionally vulnerable endpoint (Debug endpoint exposed)
app.get('/api/debug/config', (req, res) => {
    res.json({
        dbConnectionString: 'postgres://user:password@localhost:5432/db',
        apiKeys: ['API_KEY_12345'],
        environment: 'development'
    });
});

app.listen(port, () => {
    console.log(`Lab simulator running on port ${port}`);
});
