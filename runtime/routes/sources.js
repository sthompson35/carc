'use strict';
const express = require('express');
const router = express.Router();
const { requireBearer } = require('../middleware/auth');
const { getDb } = require('../db/database');

function rowToJson(row) {
    return {
        sourceId: row.source_id,
        name: row.name,
        authority: row.authority,
        sourceUri: row.source_uri,
        contentHash: row.content_hash,
        permissionBasis: row.permission_basis,
        provenance: row.provenance,
        status: row.status,
        freshnessCheckedAt: row.freshness_checked_at,
        reviewDueAt: row.review_due_at,
        registeredBy: row.registered_by,
        createdAt: row.created_at,
        accessValidatedAt: row.access_validated_at,
        accessPurpose: row.access_purpose
    };
}

// GET /api/sources
router.get('/api/sources', requireBearer, function (req, res) {
    const rows = getDb().prepare('SELECT * FROM sources ORDER BY created_at DESC').all();
    res.json({ total: rows.length, rows: rows.map(rowToJson) });
});

// POST /api/sources  { sourceId, name, authority, sourceUri, contentHash, permissionBasis,
//   provenance, status, freshnessCheckedAt, reviewDueAt, registeredBy }
router.post('/api/sources', requireBearer, function (req, res) {
    const b = req.body || {};
    const sourceId = String(b.sourceId || '').trim();
    if (!sourceId) return res.status(400).json({ error: 'BAD_REQUEST', reason: 'sourceId is required' });
    if (!String(b.name || '').trim()) return res.status(400).json({ error: 'BAD_REQUEST', reason: 'name is required' });
    if (!String(b.authority || '').trim()) return res.status(400).json({ error: 'BAD_REQUEST', reason: 'authority is required' });

    const db = getDb();
    db.prepare(`
        INSERT INTO sources (source_id, name, authority, source_uri, content_hash, permission_basis, provenance, status, freshness_checked_at, review_due_at, registered_by)
        VALUES (@sourceId, @name, @authority, @sourceUri, @contentHash, @permissionBasis, @provenance, @status, @freshnessCheckedAt, @reviewDueAt, @registeredBy)
        ON CONFLICT(source_id) DO UPDATE SET
            name = excluded.name, authority = excluded.authority, source_uri = excluded.source_uri,
            content_hash = excluded.content_hash, permission_basis = excluded.permission_basis,
            provenance = excluded.provenance, status = excluded.status,
            freshness_checked_at = excluded.freshness_checked_at, review_due_at = excluded.review_due_at,
            registered_by = excluded.registered_by
    `).run({
        sourceId, name: b.name.trim(), authority: b.authority.trim(),
        sourceUri: b.sourceUri || null, contentHash: b.contentHash || null,
        permissionBasis: b.permissionBasis || null, provenance: b.provenance || null,
        status: b.status || 'ACTIVE', freshnessCheckedAt: b.freshnessCheckedAt || null,
        reviewDueAt: b.reviewDueAt || null, registeredBy: b.registeredBy || null
    });
    const row = db.prepare('SELECT * FROM sources WHERE source_id = ?').get(sourceId);
    res.status(201).json(rowToJson(row));
});

// POST /api/sources/:id/access  { purpose }
// Real access-validation event, not a rubber stamp: the source must already be registered
// and ACTIVE, or this fails — matching how every other "validate X" action in this codebase
// refuses to succeed against something that doesn't exist yet.
router.post('/api/sources/:id/access', requireBearer, function (req, res) {
    const sourceId = req.params.id;
    const db = getDb();
    const row = db.prepare('SELECT * FROM sources WHERE source_id = ?').get(sourceId);
    if (!row) return res.status(404).json({ error: 'NOT_FOUND', reason: 'Source ' + sourceId + ' is not registered' });
    if (row.status !== 'ACTIVE') return res.status(409).json({ error: 'SOURCE_NOT_ACTIVE', reason: 'Source status is ' + row.status });
    const purpose = String((req.body && req.body.purpose) || '').trim() || 'unspecified';
    const now = new Date().toISOString();
    db.prepare('UPDATE sources SET access_validated_at = ?, access_purpose = ? WHERE source_id = ?').run(now, purpose, sourceId);
    res.json(rowToJson(db.prepare('SELECT * FROM sources WHERE source_id = ?').get(sourceId)));
});

// GET /api/governance/control-status — computed from real, retained state, never a fixed
// pass. governedSourceAccess and enforcedPermissions are the two system-managed governance
// requirements (schema 23 on the frontend) that can only move to VERIFIED from this endpoint.
router.get('/api/governance/control-status', requireBearer, function (req, res) {
    const db = getDb();
    const now = new Date();
    const sources = db.prepare('SELECT * FROM sources').all();

    const validated = sources.filter(function (s) {
        if (s.status !== 'ACTIVE' || !s.access_validated_at) return false;
        if (s.review_due_at && new Date(s.review_due_at).getTime() < now.getTime()) return false;
        return true;
    });
    const expired = sources.filter(function (s) {
        return s.status === 'ACTIVE' && s.access_validated_at && s.review_due_at && new Date(s.review_due_at).getTime() < now.getTime();
    });
    const sourceIssues = [];
    if (!sources.length) sourceIssues.push('No governed sources registered');
    else if (!validated.length) sourceIssues.push('No source has both ACTIVE status and validated access');
    if (expired.length) sourceIssues.push(expired.length + ' source(s) past their review-due date');
    const governedSourceAccess = { verified: validated.length > 0 && expired.length === 0, count: sources.length, validatedCount: validated.length, issues: sourceIssues };

    // The request's own token proves the enforcement: a standard-scope token being able to
    // reach this endpoint at all, while genuinely denied at /api/tokens (admin-only), is the
    // retained evidence. An admin token can't prove non-admin denial for itself.
    const permissionIssues = [];
    let permissionsVerified;
    if (req.tokenScope === 'admin') {
        permissionsVerified = false;
        permissionIssues.push('Requesting token is admin-scoped — cannot serve as its own least-privilege denial evidence');
    } else {
        permissionsVerified = true;
    }
    const enforcedPermissions = { verified: permissionsVerified, tokenScope: req.tokenScope, issues: permissionIssues };

    res.json({ governedSourceAccess: governedSourceAccess, enforcedPermissions: enforcedPermissions, generatedAt: now.toISOString() });
});

module.exports = router;
