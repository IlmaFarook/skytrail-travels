<?php

if ($method === 'POST' && $path === '/api/auth/register') {
    $b = body();
    $name = isset($b['name']) ? $b['name'] : '';
    $email = isset($b['email']) ? $b['email'] : '';
    $password = isset($b['password']) ? $b['password'] : '';

    if (!is_string($name) || trim($name) === '' || !is_string($email) || trim($email) === '' || !is_string($password) || $password === '') {
        json_response(['error' => t('error.required_all')], 400);
    }
    if (!is_valid_name($name)) {
        json_response(['error' => t('error.invalid_name', ['min' => rule('nameMin'), 'max' => rule('nameMax')])], 400);
    }
    if (!is_valid_email($email)) {
        json_response(['error' => t('error.invalid_email')], 400);
    }
    if (!is_strong_password($password)) {
        json_response(['error' => t('auth.weak_password', ['min' => rule('passwordMinLength')])], 400);
    }

    $name = trim($name);
    $email = strtolower(trim($email));

    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        json_response(['error' => t('auth.email_taken')], 409);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
    $stmt = $db->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)');
    $stmt->execute([$name, $email, $hash, 'customer']);

    session_regenerate_id(true);
    $_SESSION['user'] = ['id' => (int) $db->lastInsertId(), 'name' => $name, 'email' => $email, 'role' => 'customer'];
    sync_currency_on_login($db, $_SESSION['user']['id'], null);
    json_response(['user' => $_SESSION['user']], 201);
}

if ($method === 'POST' && $path === '/api/auth/login') {
    $b = body();
    $email = isset($b['email']) ? $b['email'] : '';
    $password = isset($b['password']) ? $b['password'] : '';
    if (!is_string($email) || $email === '' || !is_string($password) || $password === '') {
        json_response(['error' => t('auth.credentials_required')], 400);
    }
    $email = strtolower(trim($email));

    // too many wrong passwords in the last 15 minutes -> make them wait
    $stmt = $db->prepare("SELECT COUNT(*) FROM login_attempts WHERE email = ? AND attempted_at > datetime('now', '-15 minutes')");
    $stmt->execute([$email]);
    if ($stmt->fetchColumn() >= 5) {
        json_response(['error' => t('auth.locked')], 429);
    }

    $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        $db->prepare('INSERT INTO login_attempts (email) VALUES (?)')->execute([$email]);
        json_response(['error' => t('auth.invalid_login')], 401);
    }
    if (!$user['is_active']) {
        json_response(['error' => t('auth.disabled')], 403);
    }

    $db->prepare('DELETE FROM login_attempts WHERE email = ?')->execute([$email]);
    session_regenerate_id(true);
    $_SESSION['user'] = ['id' => (int) $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'role' => $user['role']];
    sync_currency_on_login($db, $user['id'], $user['preferred_currency']);
    json_response(['user' => $_SESSION['user']]);
}

if ($method === 'POST' && $path === '/api/auth/logout') {
    unset($_SESSION['user']);
    session_regenerate_id(true);
    json_response(['ok' => true]);
}

if ($method === 'GET' && $path === '/api/auth/me') {
    $user = isset($_SESSION['user']) ? $_SESSION['user'] : null;
    json_response(['user' => $user]);
}
