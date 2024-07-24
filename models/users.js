const dbConnection = global.connection$;

module.exports = {
    checkApprovedUser: async (email, password) => {
        let sql = `SELECT * FROM users u LEFT JOIN approval a ON a.user_id = u.user_id WHERE u.email = ? AND u.password = ? AND u.isActive = '1'`;
        // let sql = `INSERT INTO USERS (name, email, password) VALUES (?, ?, ?)`;
        let sqlValues = [email, password];
        return dbConnection(sql, sqlValues, { debug: true });
    },
    getApprovedUser: async () => {
        let sql = `SELECT * FROM users`;
        return dbConnection(sql, { debug: true });
    }
}