'use strict';
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { requireBearer } = require('../middleware/auth');
const { validateVerifyBody } = require('../middleware/validate');
const { getDb } = require('../db/database');

const VERIFIER_ID = process.env.VERIFIER_ID || 'CARC-RUNTIME-VERIFIER-001';

function makeSignature(executionId, verifiedAt) {
    const secret = process.env.SIGNING_SECRET;
    if (!secret || secret === 'change-this-to-a-strong-random-secret') return null;
    return crypto.createHmac('sha256', secret).update(executionId + '|' + verifiedAt).digest('hex');
}

function evaluateEvidence(body) {
    if (body.authorization !== 'PASS') {
        return { verified: false, reason: 'LOCAL_CANARY_AUTHORIZATION_FAIL' };
    }
    if (body.executionResult !== 'LOCAL_CANARY_COMPLETE') {
        return { verified: false, reason: 'EXECUTION_RESULT_NOT_COMPLETE' };
    }
    if (!body.evidenceId) {
        return { verified: false, reason: 'EVIDENCE_ID_MISSING' };
    }
    const existing = getDb()
        .prepare('SELECT id, verified FROM verifications WHERE execution_id = ?')
        .get(body.executionId);
    if (existing) {
        return { verified: !!existing.verified, reason: existing.verified ? 'ALREADY_VERIFIED' : 'PREVIOUSLY_REJECTED', duplicate: true };
    }
    return { verified: true };
}

router.post('/', requireBearer, validateVerifyBody, function (req, res) {
    const body = req.body;
    const verifiedAt = new Date().toISOString();
    const result = evaluateEvidence(body);
    const signature = result.verified ? makeSignature(body.executionId, verifiedAt) : null;

    if (!result.duplicate) {
        getDb().prepare(`
            INSERT INTO verifications
                (execution_id, evidence_id, service_member_id, captured_at, source,
                 authorization, execution_result, verified, verifier_id, verified_at,
                 reason, signature, request_ip)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
            body.executionId,
            body.evidenceId  || null,
            body.serviceMemberId,
            body.capturedAt  || null,
            body.source      || null,
            body.authorization   || null,
            body.executionResult || null,
            result.verified ? 1 : 0,
            VERIFIER_ID,
            verifiedAt,
            result.reason    || null,
            signature,
            req.ip           || null
        );
    }

    const response = {
        verified:    result.verified,
        verifierId:  VERIFIER_ID,
        verifiedAt,
        executionId: body.executionId
    };
    if (signature)      response.signature = signature;
    if (result.reason)  response.reason    = result.reason;

    res.json(response);
});

module.exports = router;
