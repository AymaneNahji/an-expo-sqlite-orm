/* eslint-disable no-await-in-loop */
/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-console */
/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable class-methods-use-this */
import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
let db = null;
export const deleteDataBase = (dbName = 'an_expo_sqlite_orm.db') => {
    console.log('xxxxxxxxxxxxxxxxxx delete database xxxxxxxxxxxxxxxxxxxxxxxxx');
    return FileSystem.deleteAsync(`${FileSystem.documentDirectory}/SQLite/${dbName}`);
};
export const dbIsExistant = async (dbName = 'an_expo_sqlite_orm.db') => {
    await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}/SQLite/${dbName}`).then((exists) => {
        return exists.exists;
    });
};
export const initDatabase = async (models, dbName = 'an_expo_sqlite_orm.db') => {
    db = SQLite.openDatabaseSync(dbName);
    console.log('-----------------------init database-----------------------');
    try {
        await Promise.all(models.map((model) => model.initTable()));
        console.log('All tables created successfully');
    }
    catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
};
export const resetDatabase = async (models, dbName = 'an_expo_sqlite_orm.db') => {
    deleteDataBase()
        .then(async () => {
        db = SQLite.openDatabaseSync(dbName);
        console.log('-----------------------init database-----------------------');
        try {
            await Promise.all(models.map((model) => model.initTable()));
            console.log('All tables created successfully');
        }
        catch (error) {
            console.error('Error initializing database:', error);
            throw error;
        }
    })
        .catch((error) => {
        console.error('Error resetting database:', error);
        throw error;
    });
};
class SQLiteManager {
    model;
    constructor(model) {
        this.model = model;
        this.clearQuery.bind(this);
        this.setQuery.bind(this);
        this.all.bind(this);
        this.filter.bind(this);
        this.search.bind(this);
        this.pagination.bind(this);
        this.get.bind(this);
        this.first.bind(this);
        this.last.bind(this);
        this.getLastQuery.bind(this);
        this.queries.bind(this);
    }
    clearQuery() {
        this.query = '';
    }
    setQuery(val) {
        this.query = val;
    }
    queries = () => ({
        ALL: `SELECT * FROM ${this.model.tableName}`,
        DELETE: `DELETE FROM ${this.model.tableName}`,
        UPDATE: `UPDATE ${this.model.tableName} SET `,
        CREATE: (columns, values) => `INSERT INTO ${this.model.tableName} (${columns.join(', ')}) VALUES ( ${values.join(', ')} )`,
    });
    query = '';
    lastMethod = '';
    all() {
        this.lastMethod = "all";
        if (!this.query)
            this.setQuery(this.queries().ALL);
        return ({
            query: this.getLastQuery,
            filter: this.filter.bind(this),
            search: this.search.bind(this),
            pagination: this.pagination.bind(this),
            first: this.first.bind(this),
            last: this.last.bind(this),
            delete: this.delete.bind(this),
            update: this.update.bind(this),
            run: () => this.getFinalListResult(() => db.getAllAsync(this.query)),
        });
    }
    search = (searchText = '') => {
        if (this.lastMethod === "pagination") {
            // handle code
        }
        this.lastMethod = "search";
        let searchSqlText = '';
        if (this.query) {
            if (this.query.includes('WHERE')) {
                searchSqlText =
                    searchText && this.model.getSearchQuery(searchText)
                        ? ` AND ${this.model.getSearchQuery(searchText)}`
                        : '';
            }
            else {
                searchSqlText =
                    searchText && this.model.getSearchQuery(searchText)
                        ? ` WHERE ${this.model.getSearchQuery(searchText)}`
                        : '';
            }
        }
        else {
            searchSqlText =
                searchText && this.model.getSearchQuery(searchText)
                    ? `WHERE ${this.model.getSearchQuery(searchText)}`
                    : '';
        }
        if (searchSqlText)
            this.setQuery(`${this.queries().ALL} ${searchSqlText}`);
        return ({
            query: this.getLastQuery,
            filter: this.filter.bind(this),
            search: this.search.bind(this),
            pagination: this.pagination.bind(this),
            first: this.first.bind(this),
            last: this.last.bind(this),
            delete: this.delete.bind(this),
            update: this.update.bind(this),
            run: () => this.getFinalListResult(() => db.getAllAsync(this.query)),
        });
    };
    pagination(page, pageSize) {
        if (page < 1) {
            throw new Error('page must be great or equal to 1');
        }
        if (pageSize < 0) {
            throw new Error('pageSize must be greater than 0');
        }
        // if(this.lastMethod==="pagination"){
        //   // handle code
        // }
        this.lastMethod = "pagination";
        let nextPageQuery = this.query;
        if (this.query) {
            this.setQuery(`${this.query} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`);
            nextPageQuery = `${this.query} LIMIT ${pageSize} OFFSET ${(page) * pageSize}`;
        }
        else {
            this.setQuery(`${this.queries().ALL} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`);
            nextPageQuery = `${this.queries().ALL} LIMIT ${pageSize} OFFSET ${(page) * pageSize}`;
        }
        const _isThereNextPage = () => {
            return this.getFinalSingleResult(() => db.getAllAsync(nextPageQuery), false);
        };
        return ({
            query: this.getLastQuery,
            first: this.first.bind(this),
            last: this.last.bind(this),
            run: () => new Promise((resolve, reject) => {
                this.getFinalListResult(() => db.getAllAsync(this.query))
                    .then(async (result) => {
                    let nextPage = null;
                    const previousPage = page > 1 ? page - 1 : null;
                    await _isThereNextPage()
                        .then(() => {
                        nextPage = page + 1;
                    })
                        .catch(() => { });
                    if (result.length) {
                        resolve({
                            next: nextPage,
                            //@ts-ignore
                            nextPagination: nextPage ? () => this.pagination(nextPage, pageSize) : null,
                            previous: previousPage,
                            //@ts-ignore
                            previousPagination: previousPage ? () => this.pagination(previousPage, pageSize) : null,
                            results: result,
                        });
                    }
                    else {
                        if (page == 1) {
                            resolve({
                                next: nextPage,
                                //@ts-ignore
                                nextPagination: nextPage ? () => this.pagination(nextPage, pageSize) : null,
                                previous: previousPage,
                                //@ts-ignore
                                previousPagination: previousPage ? () => this.pagination(previousPage, pageSize) : null,
                                results: result,
                            });
                        }
                        else {
                            reject('No results found');
                        }
                    }
                });
            }),
        });
    }
    get = (id) => {
        // if(this.lastMethod==="pagination"){
        //   // handle code
        // }
        this.lastMethod = "get";
        return this.filter({ id }).first(false);
    };
    filter = (params) => {
        // if(this.lastMethod==="pagination"){
        //   // handle code
        // }
        this.lastMethod = "filter";
        let whereText = params ? this.model.getFilterQuery(params) : '';
        if (this.query) {
            if (this.query.includes('WHERE')) {
                whereText = whereText ? ` AND ${whereText}` : '';
            }
            else {
                whereText = whereText ? `WHERE ${whereText}` : '';
            }
            this.setQuery(`${this.query} ${whereText}`);
        }
        else {
            whereText = whereText ? `WHERE ${whereText}` : '';
            this.setQuery(`${this.queries().ALL} ${whereText}`);
        }
        return ({
            filter: this.filter.bind(this),
            search: this.search.bind(this),
            pagination: this.pagination.bind(this),
            run: () => this.getFinalListResult(() => db.getAllAsync(this.query)),
            query: this.getLastQuery,
            first: this.first.bind(this),
            last: this.last.bind(this),
            delete: this.delete.bind(this),
            update: this.update.bind(this),
        });
    };
    first(nullable = true) {
        if (this.query) {
            if (this.lastMethod === "pagination") {
                const OFFSET = this.query.split('OFFSET')[1];
                this.setQuery(`${this.query.split('LIMIT')[0]} ORDER BY id ASC LIMIT 1 OFFSET ${OFFSET}`);
            }
            else {
                this.setQuery(`${this.query} ORDER BY id ASC LIMIT 1`);
            }
        }
        else {
            this.setQuery(`${this.queries().ALL} ORDER BY id ASC LIMIT 1`);
        }
        this.lastMethod = "first";
        return ({
            run: () => this.getFinalSingleResult(() => db.getAllAsync(this.query), nullable),
            query: this.getLastQuery,
        });
    }
    last(nullable = true) {
        if (this.lastMethod === "pagination") {
            // handle code
        }
        if (this.query) {
            if (this.lastMethod === "pagination") {
                const OFFSET = this.query.split('OFFSET')[1];
                this.setQuery(`${this.query.split('LIMIT')[0]} ORDER BY id DESC LIMIT 1 OFFSET ${OFFSET}`);
            }
            else {
                this.setQuery(`${this.query} ORDER BY id DESC LIMIT 1`);
            }
        }
        else {
            this.setQuery(`${this.queries().ALL} ORDER BY id DESC LIMIT 1`);
        }
        this.lastMethod = "last";
        return ({
            run: () => this.getFinalSingleResult(() => db.getAllAsync(this.query), nullable),
            query: this.getLastQuery,
        });
    }
    delete() {
        if (this.query) {
            this.setQuery(this.query
                .replace(this.queries().ALL, this.queries().DELETE));
        }
        else {
            this.setQuery(this.queries().DELETE);
        }
        return ({
            run: () => {
                const oldQuery = this.query;
                this.clearQuery();
                return db.runAsync(oldQuery);
            },
            query: this.getLastQuery,
        });
    }
    update(data) {
        const fieldsToUpdate = Object.keys(data)
            .map((field_name) => {
            if (typeof data[field_name] == 'number') {
                return `${field_name} = ${data[field_name]}`;
            }
            else {
                return `${field_name} = '${data[field_name]}'`;
            }
        })
            .join(', ');
        if (this.query) {
            this.setQuery(`${this.queries().UPDATE} ${fieldsToUpdate} ${this.query.replace(this.queries().ALL, '')}`);
        }
        else {
            this.setQuery(`${this.queries().UPDATE} ${fieldsToUpdate}`);
        }
        return ({
            run: () => this.model.checkForiegnKeys(data)
                .then(() => {
                const oldQuery = this.query;
                this.clearQuery();
                return db.runAsync(oldQuery);
            }),
            query: this.getLastQuery,
        });
    }
    create(data) {
        this.setQuery(this.queries().CREATE(Object.keys(data), Object.keys(data).map(key => {
            if (typeof data[key] == 'number') {
                return `${data[key]}`;
            }
            else {
                return `'${data[key]}'`;
            }
        })));
        return ({
            run: () => this.model.checkForiegnKeys(data)
                .then(() => db.runAsync(this.query)
                .then(el => {
                this.clearQuery();
                return this.get(el.lastInsertRowId).run();
            })),
            query: this.getLastQuery,
        });
    }
    getLastQuery = () => {
        this.lastMethod = "";
        const oldQuery = this.query;
        this.clearQuery();
        return oldQuery;
    };
    async getFinalListResult(func) {
        this.lastMethod = "";
        return new Promise(async (resolve, reject) => {
            await func()
                .then(result => {
                this.clearQuery();
                resolve(result.map((el) => {
                    const item = el;
                    return ({
                        ...item,
                        delete: () => this.get(item.id).run().then(() => this.filter({ id: item.id }).delete().run()),
                        update: (data) => this.get(item.id).run()
                            .then(() => this.filter({ id: item.id }).update(data).run()
                            .then(() => this.get(item.id).run())),
                        children: (table) => {
                            const obj = this.model.getChildren()[table];
                            return obj.table.objects.filter({ [obj.fieldName]: item.id });
                        },
                        parent: (table) => {
                            const obj = this.model.getParents()[table];
                            return obj.table.objects.get(item.id);
                        }
                    });
                }));
            })
                .catch(error => {
                this.clearQuery();
                reject(error);
            });
        });
    }
    async getFinalSingleResult(func, nullable) {
        this.lastMethod = "";
        return new Promise(async (resolve, reject) => {
            await func()
                .then(result => {
                this.clearQuery();
                if (result.length > 0) {
                    const item = result[0];
                    resolve({
                        ...item,
                        delete: () => this.get(item.id).run().then(() => this.filter({ id: item.id }).delete().run()),
                        update: (data) => this.get(item.id).run()
                            .then(() => this.filter({ id: item.id }).update(data).run()
                            .then(() => this.get(item.id).run())),
                        children: (table) => {
                            const obj = this.model.getChildren()[table];
                            return obj.table.objects.filter({ [obj.fieldName]: item.id });
                        },
                        parent: (table) => {
                            const obj = this.model.getParents()[table];
                            return obj.table.objects.get(item.id);
                        }
                    });
                }
                else {
                    if (nullable)
                        resolve(null);
                    else
                        reject(new Error('No result found'));
                }
            })
                .catch(error => {
                this.clearQuery();
                reject(error);
            });
        });
    }
}
export class SQLiteModel {
    tableName;
    constructor() {
        this.initTable.bind(this);
        this.getSchema.bind(this);
        this.getFields.bind(this);
        this.getChildren.bind(this);
        this.getParents.bind(this);
        this.getForeignKeysFieldsNames.bind(this);
        this.getSearchQuery.bind(this);
        this.getFilterQuery.bind(this);
        this.checkForiegnKeys.bind(this);
    }
    initTable() {
        if (!db)
            throw new Error("Cannot initialize this table without a database");
        const foriegnKeysQueries = [];
        const fieldsQueries = Object.keys(this.getFields())
            .map((fieldName) => {
            const field = this.getFields()[fieldName];
            if (field.foriegnKeyTable) {
                foriegnKeysQueries.push(`FOREIGN KEY(${fieldName}) REFERENCES ${field.foriegnKeyTable.tableName}(id)`);
                return `${fieldName}  INTEGER `;
            }
            return `${fieldName} ${field.type} ${field.required ? 'NOT NULL' : ''} ${field.unique ? 'UNIQUE' : ''}`;
        });
        const createTableQuery = `CREATE TABLE IF NOT EXISTS ${this.tableName} (id INTEGER PRIMARY KEY AUTOINCREMENT, ${fieldsQueries.join(', ')}${foriegnKeysQueries.length > 0 ? ', ' : ''} ${foriegnKeysQueries.join(',')})`;
        console.log(this.tableName, 'table created =========================================================');
        console.log(createTableQuery);
        return db.runAsync(createTableQuery);
    }
    getSchema() {
        throw new Error('Model must implement getSchema method');
    }
    getFields() {
        return this.getSchema()['fields'];
    }
    getChildren() {
        return this.getSchema()['children'];
    }
    getParents() {
        return this.getSchema()['parents'];
    }
    getForeignKeysFieldsNames() {
        const foriegnKeysFieldsNames = [];
        Object.keys(this.getFields())
            .forEach((fieldName) => {
            const field = this.getFields()[fieldName];
            if (field.foriegnKeyTable) {
                foriegnKeysFieldsNames.push(fieldName);
            }
        });
        return foriegnKeysFieldsNames;
    }
    getSearchQuery(search) {
        const searchFieldsNames = [];
        Object.keys(this.getFields())
            .forEach((fieldName) => {
            const field = this.getFields()[fieldName];
            if (field.useInSearch) {
                searchFieldsNames.push(fieldName);
            }
        });
        return searchFieldsNames
            .map((item) => `${item} LIKE '%${search}%'`)
            .join(' OR ');
    }
    getFilterQuery(params) {
        const _getFilterQuery = (_params) => {
            const _whereQueries = [];
            const keys = Object.keys(_params);
            keys.forEach((key, index) => {
                if (key === 'AND') {
                    _whereQueries.push(this.getFilterQuery(_params[key]));
                }
                else if (key === 'OR') {
                    _whereQueries.push(this.getFilterQuery(_params[key]));
                }
                else {
                    const [fieldName, lookUp] = key.split('__');
                    const value = _params[key];
                    if (lookUp && value) {
                        if (lookUp === 'lte') {
                            if (typeof value === 'number')
                                _whereQueries.push(` ${fieldName} <= ${value} `);
                        }
                        else if (lookUp === 'gte') {
                            if (typeof value === 'number')
                                _whereQueries.push(` ${fieldName} >= ${value} `);
                        }
                        else if (lookUp === 'in') {
                            if (typeof value === 'number') {
                                _whereQueries.push(` ${fieldName} in (${value}) `);
                            }
                            else if (typeof value === 'string') {
                                _whereQueries.push(` ${fieldName} in ('${value}') `);
                            }
                            else if (value.toString().length > 0) {
                                _whereQueries.push(` ${fieldName} in (${value.map((item) => typeof item === 'number' ? `${item} ` : `'${item}' `)}) `);
                            }
                        }
                        else if (lookUp === 'contains') {
                            _whereQueries.push(` ${fieldName} LIKE '%${value.toString()}%' `);
                        }
                        else if (lookUp === 'icontains') {
                            _whereQueries.push(` LOWER(${fieldName}) LIKE '%${value.toString()}%' `);
                        }
                    }
                    else if (typeof value === 'number') {
                        _whereQueries.push(` ${fieldName} = ${value} `);
                    }
                    else {
                        _whereQueries.push(` ${fieldName} = '${value}' `);
                    }
                }
            });
            return _whereQueries;
        };
        const whereQueries = [];
        const keys = Object.keys(params);
        keys.forEach((key, index) => {
            if (key === 'AND') {
                whereQueries.push(` (${_getFilterQuery(params[key]).join(' AND ')}) `);
            }
            else if (key === 'OR') {
                whereQueries.push(` (${_getFilterQuery(params[key]).join(' OR ')}) `);
            }
            else {
                const [fieldName, lookUp] = key.split('__');
                const value = params[key];
                if (lookUp) {
                    if (lookUp === 'lte') {
                        if (typeof value === 'number')
                            whereQueries.push(` ${fieldName} <= ${value} `);
                    }
                    else if (lookUp === 'gte') {
                        if (typeof value === 'number')
                            whereQueries.push(` ${fieldName} >= ${value} `);
                    }
                    else if (lookUp === 'in') {
                        if (typeof value === 'number') {
                            whereQueries.push(` ${fieldName} in (${value}) `);
                        }
                        else if (typeof value === 'string') {
                            whereQueries.push(` ${fieldName} in ('${value}') `);
                        }
                        else if (value.toString().length > 0) {
                            whereQueries.push(` ${fieldName} in (${value.map((item) => typeof item === 'number' ? `${item} ` : `'${item}'`)}) `);
                        }
                    }
                    else if (lookUp === 'contains') {
                        whereQueries.push(` ${fieldName} LIKE '%${value.toString()}%' `);
                    }
                    else if (lookUp === 'icontains') {
                        whereQueries.push(` LOWER(${fieldName}) LIKE '%${value.toString()}%' `);
                    }
                }
                else if (typeof value === 'number') {
                    whereQueries.push(` ${fieldName} = ${value} `);
                }
                else {
                    whereQueries.push(` ${fieldName} = '${value}' `);
                }
            }
        });
        return whereQueries.join(' AND ');
    }
    async checkForiegnKeys(_data) {
        const foriegnKeysFieldsNames = this.getForeignKeysFieldsNames();
        if (foriegnKeysFieldsNames.length > 0) {
            const allForeignKeysNotExists = [];
            for (const fieldName of foriegnKeysFieldsNames) {
                const field = this.getFields()[fieldName];
                if (field.foriegnKeyTable) {
                    try {
                        if (_data[fieldName])
                            await field.foriegnKeyTable.objects.filter({ id: _data[fieldName] }).first(false);
                    }
                    catch (error) {
                        console.log('Foreign key(s) does not exist', fieldName);
                        allForeignKeysNotExists.push(fieldName);
                    }
                }
            }
            if (allForeignKeysNotExists.length > 0) {
                throw Error(`Foreign key(s) : << ${allForeignKeysNotExists
                    .map((el) => `${el}:${_data[el]}`)
                    .toString()} >> does not exist`);
            }
        }
    }
    ;
    objects = new SQLiteManager(this);
}
