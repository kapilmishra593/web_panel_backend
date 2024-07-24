/* eslint-disable no-prototype-builtins */
const connection = require('../config/dbConnection');
const dbConnection = global.connection$;

const methods = module.exports = {
    insert: async ({ table, data, meta, debug, db }) => {
        if (!connection) {
            connection = dbConnection;
        }
        // console.log(data);
        data = JSON.parse(JSON.stringify(data));
        /*check if data is array*/
        if (typeof data === 'object' && data.length !== undefined) {
            let keys = Object.keys(data[0]);//here special case break 
            let values = [];
            data.map(obj => {
                values = [...values, ...keys.map(key => {
                    if (obj[key] && typeof obj[key] == 'object') {
                        if (!Object.keys(obj[key]).length) {
                            obj[key] = Array.isArray(obj[key]) ? [] : {};
                        }
                        return JSON.stringify(obj[key]);
                    }
                    return obj[key];
                })];
            });
            let total_insertions = '';
            Array(data.length).fill(',').forEach((d, i) => {
                if (i !== 0) {
                    total_insertions += ',';
                }
                total_insertions += `(${Array(keys.length).fill('?')})`;
            });
            let sql = `INSERT INTO ${db ? db + '.' : ''}${table} (${keys.join(',')}) VALUES ${total_insertions}`;
            if (meta && meta.hasOwnProperty('duplicate_key_check') && meta.duplicate_key_check) {
                sql += ` ON DUPLICATE KEY UPDATE ${meta.duplicate_key_check}=${meta.duplicate_key_check} `;
            }

            let output = await dbConnection(sql, values, {debug:true});

            /*return fields  as meta output key*/
            if (meta && meta.output) {
                let ls = { ...output, meta };
                ls[meta.output] = output.fields;
                return ls;
            }
            return { ...output, meta };
        }
        let keys = Object.keys(data);
        let values = keys.map(key => {
            if (data[key] && typeof data[key] == 'object') {
                if (!Object.keys(data[key]).length) {
                    data[key] = Array.isArray(data[key]) ? [] : {};
                }
                return JSON.stringify(data[key]);
            }
            return data[key];
        });
        let sql = `INSERT INTO ${db ? db + '.' : ''}${table} (${keys.join(',')}) VALUES (${Array(keys.length).fill('?')})`;
        if (meta && meta.hasOwnProperty('duplicate_key_check') && meta.duplicate_key_check) {
            sql += ` ON DUPLICATE KEY UPDATE ${meta.duplicate_key_check}=${meta.duplicate_key_check} `;
        }
        let output = await dbConnection(sql, values, {debug:true});

        /*return fields  as meta output key*/
        if (meta && meta.output) {
            let ls = { ...output, meta };
            ls[meta.output] = output.fields;
            return ls;
        }

        return { ...output, meta };
    },
    // get: async ({table, selectValues, whereConditions}) => {
    //     let selectValuesStr = ``, whereConditionsStr = ``, whereConditionsArr = Object.values(whereConditions);
    //     if (selectValues && selectValues.length) {
    //         selectValuesStr = selectValues.join(', ');
    //         // selectValues.forEach((value, index) => {
    //             // (index < selectValues.length - 1) ? selectValuesStr += `${value}, ` : selectValuesStr += `${value}`;
    //         // });
    //     }
    //     if (whereConditions && Object.entries(whereConditions).length) {
    //         let conditionsReq = Object.keys(whereConditions);
    //         conditionsReq.forEach((condition, index) => {
    //             (index < conditionsReq.length - 1) ? whereConditionsStr += `${condition} = ? AND ` : whereConditionsStr += `${condition} = ?`;
    //         });
    //     };
    //     let sql = `SELECT ${selectValuesStr} FROM ${table} WHERE ${whereConditionsStr}`;
    //     // let result = await dbConnection(sql, whereConditionsArr, true);
    //     // return result;
    //     return await sqldbConnection(sql, whereConditionsArr);
    // },
    get: async ({ table, value, key, debug, multiCondition, multiConditionClause, searchText, meta, projection, offset, sort, authorDetails, joins, group, db}) => {
        if (!connection) {
            connection = dbConnection;
        }
        value = value || null;//important condition for handling
        let pagination = "", total_count, condition = "", values_arr = [];        
        const sort_data = sort ? ` order by ` + (sort.sort_key ? table+'.'+sort.sort_key: (table+'.created') )+ ` ` + (sort.sort_order ? sort.sort_order : 'desc') : ``;
        let roleJoin = ``;
        if (key) {
            if (key.indexOf(".") === -1) {
                condition += ` where ${table}.${key}=?`;
            }
            else{
                condition += ` where ${key}=?`;
            }
            values_arr.push(value);
        } else {
            condition = "";
        }
        let group_str = '';
        if (group && group.length && group.filter(d => d).length) {
            group_str = ' GROUP BY ' + group.join(',');
        }

        if (!multiConditionClause) {
            multiConditionClause = 'IN';
        }

        if (multiCondition) {
            if (table === 'user') {
                roleJoin = `LEFT JOIN role id on id.role_id = user.role_id`;
            }
            for (let getKey in multiCondition) {
                if (multiCondition.hasOwnProperty(getKey) && getKey) {
                    // if (typeof multiCondition[getKey] == 'undefined') {
                    //     console.error("issue multicondition passed in Get crud with undefined key's value", getKey, ' in query=> ', projection);
                    //     throw new Error("issue multicondition passed in Get crud with undefined key's value");
                    // }

                    if (!condition) {
                        condition = " where ";
                    }
                    if (multiCondition[getKey] && multiCondition[getKey].length > 0 && typeof multiCondition[getKey] == 'object') {
                        if (condition !== ' where ') {
                            condition += ' and  ';
                        }
                        condition += `${getKey} ${multiConditionClause} (${Array(multiCondition[getKey].length).fill('?')}) `;
                        values_arr = [...values_arr, ...multiCondition[getKey]];
                    } else if (typeof multiCondition[getKey] != 'undefined') {//value should not be undefined
                        if (condition !== ' where ') {
                            condition += ' and  ';
                        }
                        // console.log((multiCondition[getKey].toString()).startsWith('!'), multiCondition[getKey])
                        if (multiCondition[getKey] && (multiCondition[getKey].toString()).startsWith('!')) {
                            condition += `${getKey}!=?`;
                            values_arr.push(multiCondition[getKey].substr(1));
                        } else if (multiCondition[getKey] && (multiCondition[getKey].toString()).includes(' IS NOT NULL ')) {
                            condition += `${getKey} IS NOT NULL `;
                            // values_arr.push(multiCondition[getKey].substr(1));
                        } else if (multiCondition[getKey] && (multiCondition[getKey].toString()).includes(' IS NULL ')) {
                            condition += `${getKey} IS NULL `;
                            // values_arr.push(multiCondition[getKey].substr(1));
                        } else {

                            if (multiCondition[getKey] === null) {
                                condition += `${getKey} IS NULL `;
                                // values_arr.push(multiCondition[getKey].substr(1));
                            } else {
                                condition += `${getKey}=?`;
                                values_arr.push(multiCondition[getKey]);
                            }
                        }
                    } else {
                        console.log(`Error Exception case undefined key occured ${multiCondition[getKey] || JSON.stringify(multiCondition)} in Get crud function for table ${table}`);
                    }
                }
            }
        }

        let join_str = '';
        if (joins && Array.isArray(joins)) {
            joins.forEach(join => {
                join.type = join.type || 'left';
                if (join.on && join.table && join.on && join.on.length > 0) {
                    if (join.projection && Array.isArray(join.projection)) {
                        let table_keys = ` (select `;
                        join.projection.forEach((proj, i) => {
                            if (i) {
                                table_keys += ` , `;
                            }
                            table_keys += ` ${join.table}.${proj}`;
                        });
                        table_keys += ` from ${db ? db+'.' : ''}${join.table} where isActive='1') as ${join.table} `;
                        join_str += ` ${join.type} join ${table_keys} on `;
                    } else {
                        join_str += ` ${join.type} join ${join.table} on `;
                    }
                    joinKeys = Array(join.on);
                    joinKeys.forEach((key, i) => {
                        if (i) {
                            join_str += ` and `;
                        }
                        /*if join already defiend*/
                        if (key.includes('=')) {
                            join_str += key;
                        } else {
                            join_str += ` ${join.table}.${key}=${table}.${key}`;
                        }
                    });
                }

            });
        }

        if (searchText) {
            if (!condition) {
                condition = " where ";
            }
            if(isNaN(searchText)) {
                searchText = unescape(searchText);
            }
            searchText = '%' + searchText + '%';

            for (let i = 0; i < 3; i++) {
                values_arr.push(searchText);
            }
            if (condition !== ' where ') {
                condition += ' and  ';
            }
            condition += `(${table}.email like ? OR ${table}.contact_no like ? OR full_name like ?)`; // concat(${table}.first_name, ' ', ${table}.last_name)
        }
        if (offset) {
            pagination = ` LIMIT ${offset.offset},${offset.limit} `;
            total_count = await dbConnection(`SELECT COUNT(*) AS total from ${db ? db+'.' : ''}${table} ${roleJoin} ${join_str} ${condition} ${group_str} ${sort_data}`, values_arr, {debug:true});
            if (total_count.fields && total_count.fields.length) {
                total_count = total_count.fields[0]["total"];
            } else {
                total_count = 0;
            }
        }
        let output;
        let column_select = `*`;
        if(authorDetails){
            column_select += `, (select u.full_name from user u where u.user_id=${table}.created_by) as created_by, ${table}.created, ${table}.modified,
            (select u.full_name from user u where u.user_id=${table}.modified_by) as modified_by `;
        }

        let query = `SELECT ${projection || column_select} from ${db ? db+'.' : ''}${table} ${join_str} ${condition}  ${group_str}  ${sort_data} ${pagination}`;
        if ((key && value)) {
            query = `SELECT ${projection || column_select} from ${db ? db+'.' : ''}${table} ${join_str} ${roleJoin} ${condition}  ${group_str}  ${sort_data} ${pagination}`;
        } else if (multiCondition) {
            query = `SELECT ${projection || column_select} from ${db ? db+'.' : ''}${table} ${join_str} ${condition}  ${group_str}  ${sort_data} ${pagination}`;
        }
        // console.log(query, values_arr);
        output = await dbConnection(query, values_arr, { debug : true });
        /*return fields  as meta output key*/
        if (meta && meta.output) {
            let ls = { ...output, meta, total_count };
            ls[meta.output] = output.fields;
            return ls;
        }
        return { ...output, meta, total_count };

    },
    update: async ({ table, data, value, key, multiCondition, meta, limit_check = false, debug, multiConditionClause, validate_only = false }) => {//TODO make a check for multicondition that no undefied key should be passed through
        if (!connection) {
            connection = dbConnection;
        }

        let limit_condition = limit_check ? " LIMIT 1 " : "";

        data = JSON.parse(JSON.stringify(data));
        let set = 'set ';
        let values_arr = [];
        for (let updateKey in data) {
            if (data.hasOwnProperty(updateKey)) {
                if (set !== 'set ') {
                    set += ', ';
                }

                if (data[updateKey] === 'NOW()') {
                    set += `${updateKey}=NOW()`;
                } else if (updateKey === 'used_count' || updateKey === 'failed_retry_count' || updateKey === 'absolute_copy') {
                    set += `${updateKey}=` + data[updateKey];
                } else if (data[updateKey] === 'NULL') {
                    set += `${updateKey}=NULL`;
                } else {
                    set += `${updateKey}=?`;
                    if (data[updateKey] && typeof data[updateKey] == 'object') {
                        data[updateKey] = JSON.stringify(data[updateKey]);
                    }
                    values_arr.push(data[updateKey]);
                }
            }
        }
        let sql = `Update ${table} ${set} where ${key}=?`;
        if (multiCondition) {
            let where = ' where ';
            for (let updateKey in multiCondition) {
                if (multiCondition.hasOwnProperty(updateKey) && updateKey) {
                    if (typeof multiCondition[updateKey] == 'undefined') {
                        console.error("issue multicondition passed with undefined key's value", updateKey, ' in query=> ', sql);
                        throw new Error("issue multicondition passed with undefined key's value");
                    }
                    if (where !== ' where ') {
                        where += ' and  ';
                    }
                    if (multiCondition[updateKey] === 'IS NULL' || multiCondition[updateKey] === null) {
                        where += `${updateKey} IS NULL `;
                    } else if (multiCondition[updateKey] && multiCondition[updateKey].length > 0 && typeof multiCondition[updateKey] == 'object') {
                        where += `${updateKey} ${multiConditionClause} (${Array(multiCondition[updateKey].length).fill('?')}) `;
                        values_arr = [...values_arr, ...multiCondition[updateKey]];
                    } else {
                        where += `${updateKey}=?`;
                        values_arr.push(multiCondition[updateKey]);
                    }
                }
            }
            sql = `Update ${table} ${set} ${where}`;

        } else {
            values_arr.push(value);
        }
        sql = sql.concat(limit_condition);

        let output = await dbConnection(sql, values_arr, {debug:true}); //, { debug: true }

        /*return fields  as meta output key*/
        if (meta && meta.output) {
            let ls = { ...output, meta };
            ls[meta.output] = output.fields;
            return ls;
        }

        return { ...output, meta };
    },
    remove: async ({ table, value, key, meta, multiCondition }) => {
        if (!connection) {
            connection = dbConnection;
        }
        let where = ``;
        let values_arr = [];
        if (multiCondition) {
            where = ' where ';
            for (let updateKey in multiCondition) {
                if (multiCondition.hasOwnProperty(updateKey) && updateKey && multiCondition[updateKey]) {
                    if (where !== ' where ') {
                        where += ' and  ';
                    }
                    if (multiCondition[updateKey] === 'IS NULL') {
                        where += `${updateKey} IS NULL `;
                    } else {
                        where += `${updateKey}=?`;
                        values_arr.push(multiCondition[updateKey]);
                    }
                }
            }
        } else {
            where += ` where ${key} = ?`;
            values_arr.push(value);
        }
        let sql = `delete from ${table} ${where}`;
        let output = await dbConnection(sql, values_arr, {debug:true});
        return { ...output, meta };
    },
    upsert: async ({ table, data, value, key, multiCondition, meta, debug }) => {
        try {
            // eslint-disable-next-line no-unused-vars
            let { created_by, ...all } = data;
            const { fields } = await methods.update({ table, data: all, value, key, multiCondition, connection, meta, debug });
            if (fields.affectedRows > 0) {
                return fields;
            }
            let inserted = await methods.insert({ table, data, connection, meta, debug });
            return inserted.fields;
        } catch (e) {
            console.error(e, '*****************upsert => e');
            throw new Error(e);
        }
    }
};
