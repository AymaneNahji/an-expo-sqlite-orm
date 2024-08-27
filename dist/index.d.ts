import * as SQLite from 'expo-sqlite';
export declare const deleteDataBase: (dbName?: string) => Promise<void>;
export declare const dbIsExistant: (dbName?: string) => Promise<void>;
export declare const initDatabase: (models: SQLiteModel<any>[], dbName?: string) => Promise<void>;
export declare const resetDatabase: (models: SQLiteModel<any>[], dbName?: string) => Promise<void>;
declare class SQLiteManager<S extends SQLiteModelSchemaType> {
    private model;
    constructor(model: SQLiteModel<S>);
    private clearQuery;
    private setQuery;
    private queries;
    private query;
    private lastMethod;
    all(): {
        query: () => string;
        filter: typeof this.filter;
        search: typeof this.search;
        pagination: typeof this.pagination;
        first: typeof this.first;
        last: typeof this.last;
        delete: typeof this.delete;
        update: typeof this.update;
        run: () => Promise<InstanceWithOps<S>[]>;
    };
    search: (searchText?: string) => SearchReturnType<S>;
    pagination(page: number, pageSize: number): {
        query: () => string;
        first: typeof this.first;
        last: typeof this.last;
        run: () => Promise<{
            next: number | null;
            nextPagination: () => ReturnType<SQLiteManager<S>["pagination"]> | null;
            previous: number | null;
            previousPagination: () => ReturnType<SQLiteManager<S>["pagination"]> | null;
            results: InstanceWithOps<S>[];
        }>;
    };
    get: (id: number) => {
        run: () => Promise<any>;
        query: () => string;
    };
    filter: (params?: FilterParams<InstanceWithId<S["fields"]>>) => FilterReturnType<S>;
    first(nullable?: boolean): {
        run: () => Promise<InstanceWithOps<S> | null>;
        query: () => string;
    };
    last(nullable?: boolean): {
        run: () => Promise<InstanceWithOps<S> | null>;
        query: () => string;
    };
    delete(): {
        run: () => Promise<SQLite.SQLiteRunResult>;
        query: () => string;
    };
    update(data: Partial<S['fields']>): {
        run: () => Promise<SQLite.SQLiteRunResult>;
        query: () => string;
    };
    create(data: S['fields']): {
        run: () => Promise<any>;
        query: () => string;
    };
    private getLastQuery;
    private getFinalListResult;
    private getFinalSingleResult;
}
export declare class SQLiteModel<S extends SQLiteModelSchemaType> {
    tableName: string;
    constructor();
    initTable(): Promise<SQLite.SQLiteRunResult>;
    getSchema(): SQLiteModelSchema<S>;
    getFields(): { [key in keyof S["fields"]]: {
        type: SQLiteColumnTypes;
        required?: boolean;
        unique?: boolean;
        foriegnKeyTable?: SQLiteModel<any>;
        useInSearch?: boolean;
    }; };
    getChildren(): { [key in keyof S["children"]]: {
        table: SQLiteModel<any>;
        fieldName: string;
    }; };
    getParents(): { [key in keyof S["parents"]]: {
        table: SQLiteModel<any>;
        fieldName: string;
    }; };
    getForeignKeysFieldsNames(): string[];
    getSearchQuery(search: string): string;
    getFilterQuery(params: FilterParams<InstanceWithId<S['fields']>>): string;
    checkForiegnKeys(_data: Partial<S['fields']>): Promise<void>;
    objects: SQLiteManager<S>;
}
type SearchReturnType<S extends SQLiteModelSchemaType> = {
    query: () => string;
    filter: (params?: FilterParams<InstanceWithId<S['fields']>>) => FilterReturnType<S>;
    search: (searchText?: string) => SearchReturnType<S>;
    pagination: typeof SQLiteManager<S>['prototype']['pagination'];
    first: typeof SQLiteManager<S>['prototype']['first'];
    last: typeof SQLiteManager<S>['prototype']['last'];
    delete: typeof SQLiteManager<S>['prototype']['delete'];
    update: typeof SQLiteManager<S>['prototype']['update'];
    run: () => Promise<InstanceWithId<S['fields']>[]>;
};
type FilterReturnType<S extends SQLiteModelSchemaType> = {
    filter: (params?: FilterParams<InstanceWithId<S['fields']>>) => FilterReturnType<S>;
    search: typeof SQLiteManager<S>['prototype']['search'];
    pagination: typeof SQLiteManager<S>['prototype']['pagination'];
    run: () => Promise<InstanceWithId<S['fields']>[]>;
    query: () => string;
    first: typeof SQLiteManager<S>['prototype']['first'];
    last: typeof SQLiteManager<S>['prototype']['last'];
    delete: typeof SQLiteManager<S>['prototype']['delete'];
    update: typeof SQLiteManager<S>['prototype']['update'];
};
type SQLiteColumnTypes = 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'BOOLEAN';
export type SQLiteModelSchemaType = {
    fields: {
        [x: string]: any;
    };
    children: {
        [x: string]: SQLiteModel<any>;
    };
    parents: {
        [x: string]: SQLiteModel<any>;
    };
};
export type SQLiteModelSchema<Schema extends SQLiteModelSchemaType> = {
    fields: {
        [key in keyof Schema['fields']]: {
            type: SQLiteColumnTypes;
            required?: boolean;
            unique?: boolean;
            foriegnKeyTable?: SQLiteModel<any>;
            useInSearch?: boolean;
        };
    };
    children: {
        [key in keyof Schema['children']]: {
            table: SQLiteModel<any>;
            fieldName: string;
        };
    };
    parents: {
        [key in keyof Schema['parents']]: {
            table: SQLiteModel<any>;
            fieldName: string;
        };
    };
};
export type InstanceWithId<T extends SQLiteModelSchemaType['fields']> = T & {
    id: number;
};
export type InstanceWithOps<S extends SQLiteModelSchemaType> = (S['fields'] & {
    id: number;
    delete: () => ReturnType<ReturnType<SQLiteModel<S>['objects']['delete']>['run']>;
    update: (data: Partial<S['fields']>) => ReturnType<ReturnType<SQLiteModel<S>['objects']['get']>['run']>;
    children: <K extends keyof S['children']>(table: K) => ReturnType<S['children'][K]['objects']['filter']>;
    parent: <K extends keyof S['parents']>(table: K) => ReturnType<S['parents'][K]['objects']['get']>;
});
export type FilterLookups_JUST_FOR_CORRECT_KEYS<T> = {
    [K in keyof T as `${Extract<K, string>}${T[K] extends number ? '' | '__lte' | '__gte' | '__in' | '__contains' : T[K] extends boolean ? '' | '__in' : '' | '__in' | '__contains'}`]: T[K];
};
export type FilterLookups<T> = {
    [K in keyof FilterLookups_JUST_FOR_CORRECT_KEYS<T>]: K extends `${infer _U}__in` ? FilterLookups_JUST_FOR_CORRECT_KEYS<T>[K][] : FilterLookups_JUST_FOR_CORRECT_KEYS<T>[K];
};
export type FilterParams<T> = {
    [KEY in keyof FilterLookups<T> | 'AND' | 'OR']?: KEY extends 'OR' | 'AND' ? FilterParams<T> : FilterLookups<T>[KEY extends keyof FilterLookups<T> ? KEY : never];
};
export {};
