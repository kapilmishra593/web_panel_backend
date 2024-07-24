const express = require('express');
const router = express.Router();
const { userSignup, userLogin, updateSignupStatus, userLogout, getUsers } = require('../controllers/users');
const { checkBlankValue } = require('../utils/common');

router.route('/register')
    .post(checkBlankValue(['full_name', 'email', 'employee_id', 'user_role', 'password']), userSignup);
router.route('/login').post(checkBlankValue(['email', 'password']), userLogin);
router.route('/updateSignupStatus').post(checkBlankValue(['approved_for_user', 'approval_status', 'approval_type']), updateSignupStatus);
// router.route('/logout').post(checkBlankValue(['full_name', 'email', 'employee_id', 'user_role', 'password']), userLogout);
router.route('/get_user').get(getUsers);

module.exports = router;