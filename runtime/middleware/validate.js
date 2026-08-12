'use strict';

function validateVerifyBody(req, res, next) {
    const b = req.body || {};
    if (!b.executionId || typeof b.executionId !== 'string') {
        return res.status(400).json({ error: 'BAD_REQUEST', reason: 'executionId is required' });
    }
    if (!b.serviceMemberId || typeof b.serviceMemberId !== 'string') {
        return res.status(400).json({ error: 'BAD_REQUEST', reason: 'serviceMemberId is required' });
    }
    if (b.source !== 'CARC_LOCAL_CANARY') {
        return res.status(400).json({ error: 'BAD_REQUEST', reason: 'source must be CARC_LOCAL_CANARY' });
    }
    next();
}

module.exports = { validateVerifyBody };
