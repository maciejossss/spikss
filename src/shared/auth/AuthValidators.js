const { body, validationResult } = require('express-validator');
const ModuleErrorHandler = require('../error/ModuleErrorHandler');

class AuthValidators {
    constructor() {
        this.logger = ModuleErrorHandler.logger;
    }

    static loginValidationRules() {
        return [
            body('username')
                .trim()
                .notEmpty()
                .withMessage('Username is required')
                .isLength({ min: 3 })
                .withMessage('Username must be at least 3 characters long'),
            body('password')
                .notEmpty()
                .withMessage('Password is required')
                .isLength({ min: 6 })
                .withMessage('Password must be at least 6 characters long')
        ];
    }

    static registrationValidationRules() {
        return [
            body('username')
                .trim()
                .notEmpty()
                .withMessage('Username is required')
                .isLength({ min: 3 })
                .withMessage('Username must be at least 3 characters long')
                .matches(/^[a-zA-Z0-9_]+$/)
                .withMessage('Username can only contain letters, numbers and underscores'),
            body('password')
                .notEmpty()
                .withMessage('Password is required')
                .isLength({ min: 6 })
                .withMessage('Password must be at least 6 characters long')
                .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/)
                .withMessage('Password must contain at least one letter and one number'),
            body('email')
                .trim()
                .notEmpty()
                .withMessage('Email is required')
                .isEmail()
                .withMessage('Invalid email format'),
            body('role')
                .optional()
                .isIn(['admin', 'user', 'technician'])
                .withMessage('Invalid role specified')
        ];
    }

    static validate(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => ({
                    field: err.param,
                    message: err.msg
                }))
            });
        }
        next();
    }

    static passwordResetValidationRules() {
        return [
            body('email')
                .trim()
                .notEmpty()
                .withMessage('Email is required')
                .isEmail()
                .withMessage('Invalid email format'),
            body('token')
                .optional()
                .isLength({ min: 32, max: 32 })
                .withMessage('Invalid reset token'),
            body('newPassword')
                .optional()
                .isLength({ min: 6 })
                .withMessage('New password must be at least 6 characters long')
                .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/)
                .withMessage('New password must contain at least one letter and one number')
        ];
    }
}

module.exports = AuthValidators; 