const connection = require("../config/dbConnection");

const methods = {
    success: (res, message, data, statusCode = 200) => {
        res.status(statusCode).json({
            status: statusCode,
            message: message,
            data
        });
    },

    error: (res, message, data, statusCode = 500) => {
        res.status(statusCode).json({
            status: statusCode,
            error: message || "Something Went Wrong. Please Try Again Later.",
            data
        });
    },

    notFound: (res, message, data, statusCode = 404) => {
        res.status(statusCode).json({
            status: statusCode,
            error: message,
            data
        });
    },

    invalidRequest: (res, message, data, statusCode = 400) => {
        res.status(statusCode).json({
            status: statusCode,
            error: message,
            data
        });
    },

    alreadyExists: (res, message, data, statusCode = 403) => {
        res.status(statusCode).json({
            status: statusCode,
            error: message,
            data
        });
    },

    actionNotPermitted: (res, message, data, statusCode = 403) => {
        res.status(statusCode).json({
            status: statusCode,
            error: message,
            data
        });
    },

    invalidUrl: (res, message, data, statusCode = 407) => {
        res.status(statusCode).json({
            status: statusCode,
            error: message,
            data
        });
    },

    dbError: (res, message, data, statusCode = 408) => {
        res.status(statusCode).json({
            status: statusCode,
            error: message,
            data
        });
    },

    validationError: (res, message, data, statusCode = 414) => {
        res.status(statusCode).json({
            status: statusCode,
            error: message,
            data
        });
    },

    validateEmail: (email) => {
        const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return regex.test(String(email).toLowerCase());
    },

    validatePhone: (phone) => {
        const regex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
        return regex.test(String(phone));
    },

    validateStrongPassword: (password) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()\-_=+{}[\]|;:'",.<>?])\S{16,}$/;
        return regex.test(String(password));
    },

    isJsonString: (str) => {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    },

    validateIP: ({ ip = '::1' }) => {
        const IPV4 = new RegExp(/^(25[0-5]|2[0-4][0-9]|1?[0-9][0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})){3}$/);
        const IPV6 = new RegExp(/^([0-9a-f]){1,4}(:([0-9a-f]){1,4}){7}$/i);
        let valid = false;
        valid = IPV4.test(ip);
        if (!valid) {
            return IPV6.test(ip);
        }
        return valid;
    },

    stringEncryption: (string) => {
        string = md5(string);
        return string;
    },

    isBlank: (item) => {
        if (item) {
            if (Array.isArray(item)) {
                item = item.filter(a => a);
                return item.length == 0;
            } else if (typeof item === 'object') {
                return Object.keys(item).length <= 0;
            } else if (typeof item === 'string') {
                item = (item == 'null') ? '' : item;
                return !item.trim();
            }
            return false;
        } else if ((typeof item === "boolean") || item === 0) {
            return false;
        }
        return true;
    },

    checkBlankValue: (reqParams) => {
        return [
            (req, res, next) => {
                let fields = reqParams.length ? reqParams : [];
                let data = req.body, output = {};
                if (typeof data === 'object' && Object.keys(data).length > 0 && fields.length > 0) {
                    let missing_fields = [];
                    for (let field of fields) {
                        if (typeof field === 'object' && field.length > 0) {
                            let sub_missing = field.filter(d => {
                                let included = Object.keys(data).includes(d);
                                let blank = methods.isBlank(data[d]);
                                return !included || blank;
                            });
                            if (sub_missing.length === field.length) {
                                missing_fields = [...missing_fields, ...sub_missing];
                            }
                        } else if (data.hasOwnProperty(field)) {
                            let is_blank = methods.isBlank(data[field]);
                            if (!fields.includes(field) || is_blank) {
                                missing_fields.push(field);
                            }
                        } else {
                            missing_fields.push(field);
                        }
                    }
                    if (missing_fields.length > 0) {
                        output = { error: true, message: 'Missing fields', missing_fields: missing_fields };
                    } else {
                        output = { error: false };
                    }
                } else {
                    if (fields.length === 0) {
                        output = { error: false };
                    } else {
                        output = { error: true, message: 'No fields provided', missing_fields: fields };
                    }
                }
                const { error, missing_fields, message } = output;
                if (error) {
                    if (missing_fields && missing_fields.length) {
                        const message = 'Missing Fields: ' + missing_fields.join(', ');
                        return methods.error(res, message);
                    }
                }
                return next();
            }
        ];
    },

    // dbConnection : async (rawSql, whereConditionsValues = [], debug = false) => {
    //     let fields;
    //     if (rawSql && whereConditionsValues && whereConditionsValues.length) {
    //         fields = await connection.query(rawSql, whereConditionsValues);
    //     } else {
    //         fields = connection.query(rawSql);
    //     }
    //     if (debug) {
    //         console.log('SQL Executed >> ', fields.sql);
    //     }
    //     // fields = fields.fields;
    //     return {fields};
    // }
};

async function dbConnection(sql, arg = [], req = {}) {
    sql = sql.replace(/[\n\s]+/g, " ");//added for flatting sql query for fast compiling
    if (!connection || connection.state == 'disconnected') {
        // return await sleep(sql, arg, req);
        let dj = await sleep(sql, arg, req);
        return dj;
    }
    stoping = 1;//resetting counter

    return new Promise((resolve, reject) => {

        let prepared_sql_query = connection.format(sql, arg);

        if (req.debug || req.validate_only) {
            console.log(connection.format(sql, arg));
            // if (req.validate_only) {//just returning if validate flag is on
            //     return resolve({ fields: [], total_count: 0 });
            // }
        }
        connection.query(sql, arg, async function (err, result) {
            if (err) {
                if (err.errno === 1062 || err.code == "ER_DUP_ENTRY") {
                    if (this.sql.indexOf("ai_") == -1) {
                        console.error("raw sql passed DUPLICATE ENTRY", this.sql);
                    }
                    return resolve({ fields: [], message: 'Duplicate entry.', code: err.code });
                }
                if (err.errno === 1452 || err.code == "ER_NO_REFERENCED_ROW_2") {
                    if (this.sql.indexOf("user_cards_sequence") >= 0 || this.sql.indexOf("user_website_history") >= 0 ) {
                        console.error("raw sql passed DUPLICATE ENTRY", this.sql);
                        return reject({
                            message: "Invalid details."
                        });
                    } 
                }
                console.error("raw sql passed", this.sql);
                // retry_query_counter += 1;//incrementing for new query parallel
                // if (err.code == "ECONNRESET" || err.code=="PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR") {
                //     // return await sleep(sql, arg, req);
                //     let dj = await sleep(sql, arg, req);
                //     return resolve(dj);
                // } else if (err.code == "ER_LOCK_WAIT_TIMEOUT" || err.code == "ER_LOCK_DEADLOCK") {//ER_LOCK_WAIT_TIMEOUT
                //     if ((req.retryQuery && req.retryQuery < 10) || !req.retryQuery) {
                //         if (!req.retryQuery) {//save query for 1st time failed
                //             let with_value_query = connection.format(sql, arg);
                //             req.retry_query_counter = retry_query_counter;
                //             await connection$('INSERT INTO `sql_failed_info` (`query_id`, `sql_value`, `error`, `retry_attempt`) VALUES (?, ?, ?, ?)', [retry_query_counter, with_value_query, JSON.stringify(err), 1]);
                //         }
                //         let worked = await retryQuery(sql, arg, req).catch(e => {
                //             // console.error("query failed again=>", sql, e);
                //             return { error: true, error_detail: e };
                //         });
                //         if (worked.error == true) {
                //             return reject(worked.error_detail);
                //         }
                //         return resolve(worked);
                //     }
                //     //storing retry failed in db after all tries
                //     await connection$('UPDATE`sql_failed_info` SET retry_attempt=? WHERE query_id=?', [req.retryQuery, req.retry_query_counter]);
                //     console.error("this is last time failed retry", req.retryQuery);
                // }

                if (err.errno === 1062 || err.code == "ER_DUP_ENTRY") {
                    return resolve({ fields: [], message: 'Duplicate entry.', code: err.code });
                }

                if (err.errno == 1644) {//user generated ER_SIGNAL_EXCEPTION from sql level itself
                    console.error("custom created ER_SIGNAL_EXCEPTION", err.message);
                } else {
                    console.error("console from error block connection3 old", err);//check duplicate code here to whom it pass error;
                }

                // let dj = await sleep(sql, arg, req)
                //     .catch(function (e) {
                //         console.error("error from sleep catch connection", e);
                //         return 411;
                //     });

                // if (dj == 411) {
                //     return reject(err);     
                // }

                // return resolve(dj);
                
                return reject(err);
            } else if (result && result.warningStatus === 1) {
                connection.query(`show warnings`, function (err, dd) {
                    console.error(err, dd[0]);
                });
            }

            return resolve({ fields: result || [], total_count: result && result.length || 0, prepared_sql_query });

        });
    });
}

global.connection$ = dbConnection;

module.exports = methods;