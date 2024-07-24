const connection = require('../config/dbConnection');
const common = require('../utils/common');
const md5 = require('md5');
const { validatePhone, validateEmail } = require('../utils/common');
const crudOperation = require('../utils/crud.db');
const { checkApprovedUser, getApprovedUser } = require('../models/users');

module.exports = {
    userSignup: async (req, res) => {
        try {
            let {
                full_name,
                email,
                con_code,
                contact,
                employee_id,
                user_role,
                password
            } = req.body;

            if (!validateEmail(email)) {
                return common.validationError(res, 'Please provide a valid email.');
            }

            if (!validatePhone(con_code + contact)) {
                return common.validationError(res, 'Please provide a valid phone number.');
            }

            if (email) {
                const exisitingUser = await crudOperation.get({
                    table: 'users',
                    multiCondition: { email: email, isActive: '1' }
                });
                if (exisitingUser && exisitingUser.fields && exisitingUser.fields.length) {
                    return common.alreadyExists(res, 'User with this email already exists.');
                }
            }

            if (contact) {
                const exisitingUser = await crudOperation.get({
                    table: 'users',
                    multiCondition: { contact: contact, isActive: '1' }
                });
                if (exisitingUser && exisitingUser.fields && exisitingUser.fields.length) {
                    return common.alreadyExists(res, 'User with this contact already exists.');
                }
            }

            if (password) {
                password = await md5(password);
            }

            let userDetails = await crudOperation.insert({
                table: 'users',
                data: {
                    full_name: full_name,
                    email: email,
                    con_code: con_code,
                    contact: contact,
                    employee_id: employee_id,
                    user_role: user_role,
                    password: password
                }
            });
            const user_id = userDetails.fields.insertId;

            // await crudOperation.insert({
            //     table: 'approval',
            //     data: {
            //         approval_type: 'SIGN_UP',
            //         user_id: user_id,
            //         created_by: user_id,
            //         modified_by: user_id
            //     }
            // });

            common.success(res, `User registered successfully!`, { user_id: user_id });
        } catch (error) {
            console.log('error >> ', error);
            return common.error(res);
        }
    },

    updateSignupStatus: async (req, res) => {
        try {
            let {
                approved_for_user,
                approval_status,
                approval_type
            } = req.body;

            let a = await crudOperation.update({
                table: 'approval',
                multiCondition: { user_id: parseInt(approved_for_user), approval_type: approval_type },
                data: {
                    approval_status: approval_status
                }
            })

            if (approval_status === 'REJECTED' && approval_type === 'SIGN_UP') {
                await crudOperation.update({
                    table: 'users',
                    multiCondition: { user_id: parseInt(approved_for_user), isActive: '1' },
                    data: {
                        isActive: '0'
                    }
                });
            }

            let successMessage = ``;
            if (approval_status === 'REJECTED') {
                successMessage = `User Rejected Successfully.`
            } else if (approval_status === 'APPROVED') {
                successMessage = `User Approved Successfully.`
            }
            common.success(res, successMessage);
        } catch (error) {
            console.log('error >> ', error);
            return common.error(res);
        }
    },

    userLogin: async (req, res) => {
        try {
            let {
                email,
                password
            } = req.body;

            if (!validateEmail(email)) {
                return common.validationError(res, 'Please provide a valid email.');
            }

            if (password) {
                password = await md5(password);
            }

            if (email) {
                let userDetails = await checkApprovedUser(email, password);
                userDetails = userDetails.fields;
                if (userDetails && userDetails.length) {
                    userDetails = userDetails[0];
                    if (userDetails.approval_status) {
                        if (userDetails.approval_status == 'PENDING') {
                            return common.error(res, 'Your sign up request has not been approved yet. Please contact the admin.');
                        } else if (userDetails.approval_status == 'REJECTED') {
                            return common.error(res, 'Your sign up has been rejected. Please contact the admin.');
                        }
                    }
                    let dataToReturn = {
                        user_id: userDetails.user_id,
                        full_name: userDetails.full_name,
                        email: userDetails.email,
                        contact: userDetails.con_code + userDetails.contact,
                        employee_id: userDetails.employee_id,
                        user_role: userDetails.user_role
                    }
                    common.success(res, `Hey, ${dataToReturn.full_name}!`, dataToReturn);
                } else {
                    common.notFound(res, `No User Found.`);
                }
            }

        } catch (error) {
            console.log('error >> ', error);
            return common.error(res);
        }
    },

    userLogout: async (req, res) => {
        try {
            let {
                user_id
            } = req.body;
        } catch (error) {
            console.log('error >> ', error);
            return common.error(res);
        }
    },

    getUsers: async (req, res) => {
        getuser = await getApprovedUser();
        res.json(getuser);
    }

}