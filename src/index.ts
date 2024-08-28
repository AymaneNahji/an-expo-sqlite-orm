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




let db : SQLite.SQLiteDatabase | null = null;

export const deleteDataBase = (dbName='an_expo_sqlite_orm.db') => {
  console.log('xxxxxxxxxxxxxxxxxx delete database xxxxxxxxxxxxxxxxxxxxxxxxx');
  return SQLite.deleteDatabaseAsync(dbName)
};

export const dbIsExistant = async (dbName='an_expo_sqlite_orm.db') => {
  await FileSystem.getInfoAsync(
    `${FileSystem.documentDirectory}/SQLite/${dbName}`,
  ).then((exists) => {
    return exists.exists;
  });
};

export const initDatabase = async (models: SQLiteModel<any>[],dbName='an_expo_sqlite_orm.db') => {
  db = SQLite.openDatabaseSync(dbName);

  console.log('-----------------------init database-----------------------');
  try {
    await Promise.all(models.map((model) => model.initTable()));
    console.log('All tables created successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export const resetDatabase = async (models: SQLiteModel<any>[],dbName='an_expo_sqlite_orm.db') => {
  
  try {
    await deleteDataBase(dbName)
  } catch (error) {
    console.log('Error deleting database:', error);
    
  }
  await initDatabase(models, dbName)
};







class SQLiteManager<S extends SQLiteModelSchemaType>{

  

  constructor(private model: SQLiteModel<S>){

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

  private clearQuery(){
    this.query = ''
  }

  private setQuery(val:string){
    this.query = val
  }


  private queries = ()=>({
    ALL:`SELECT * FROM ${this.model.tableName}`,
    DELETE:`DELETE FROM ${this.model.tableName}`,
    UPDATE:`UPDATE ${this.model.tableName} SET `,
    CREATE:(columns:string[],values:string[])=>`INSERT INTO ${this.model.tableName} (${columns.join(', ')}) VALUES ( ${values.join(', ')} )`,
  })


  private query = ''
  private lastMethod = '' as keyof SQLiteManager<S> | ''


  public all() : FilterReturnType<S> {
    this.lastMethod="all"
    if(!this.query) this.setQuery(this.queries().ALL)
    return ({
      query:this.getLastQuery,

      filter:this.filter.bind(this) as typeof this.filter,
      search:this.search.bind(this) as typeof this.search,
      pagination:this.pagination.bind(this) as typeof this.pagination,
      first:this.first.bind(this) as typeof this.first,
      last:this.last.bind(this) as typeof this.last,
      delete:this.delete.bind(this) as typeof this.delete,
      update:this.update.bind(this) as typeof this.update,

      run:()=>this.getFinalListResult(()=>db!.getAllAsync(this.query)),
    })
  }

  public search = (searchText='') : SearchReturnType<S>=>{
    if(this.lastMethod==="pagination"){
      // handle code
    }
    this.lastMethod="search"
    let searchSqlText = ''
    if(this.query) {
      if(this.query.includes('WHERE')){
        searchSqlText =
      searchText && this.model.getSearchQuery(searchText)
        ? ` AND ${this.model.getSearchQuery(searchText)}`
        : '';
      }else{
        searchSqlText =
      searchText && this.model.getSearchQuery(searchText)
        ? ` WHERE ${this.model.getSearchQuery(searchText)}`
        : '';
      }
      
    }else{
      searchSqlText =
      searchText && this.model.getSearchQuery(searchText)
        ? `WHERE ${this.model.getSearchQuery(searchText)}`
        : '';
    }
    if(searchSqlText)
      this.setQuery(`${this.queries().ALL} ${searchSqlText}`)
    
    return ({
      query:this.getLastQuery,

      filter:this.filter.bind(this) as typeof this.filter,
      search:this.search.bind(this) as typeof this.search,
      pagination:this.pagination.bind(this) as typeof this.pagination,
      first:this.first.bind(this) as typeof this.first,
      last:this.last.bind(this) as typeof this.last,
      delete:this.delete.bind(this) as typeof this.delete,
      update:this.update.bind(this) as typeof this.update,

      run:()=>this.getFinalListResult(()=>db!.getAllAsync(this.query)),
    })
  }


  public pagination(page:number,pageSize:number){

    if(page < 1){
      throw new Error('page must be great or equal to 1')
    }

    if(pageSize < 0){
      throw new Error('pageSize must be greater than 0')
    }

    // if(this.lastMethod==="pagination"){
    //   // handle code
    // }
    this.lastMethod="pagination"

    let nextPageQuery = this.query
    
    if(this.query){
      this.setQuery(`${this.query} LIMIT ${pageSize} OFFSET ${(page-1) * pageSize}`)
      nextPageQuery = `${this.query} LIMIT ${pageSize} OFFSET ${(page) * pageSize}`
    } else {
      this.setQuery(`${this.queries().ALL} LIMIT ${pageSize} OFFSET ${(page-1) * pageSize}`)
      nextPageQuery = `${this.queries().ALL} LIMIT ${pageSize} OFFSET ${(page) * pageSize}`
    }
    
    
    
    
    const _isThereNextPage = ()=>{
      return this.getFinalSingleResult(()=>db!.getAllAsync(nextPageQuery),false)
    }

      
    return ({
      query:this.getLastQuery,

      first:this.first.bind(this) as typeof this.first,
      last:this.last.bind(this) as typeof this.last,

      run:()=>new Promise<{
        next: number | null,
        nextPagination: ()=>ReturnType<SQLiteManager<S>['pagination']> | null,
        previous: number | null,
        previousPagination: ()=>ReturnType<SQLiteManager<S>['pagination']> | null,
        results: InstanceWithOps<S>[],
      }>((resolve, reject) =>{
        this.getFinalListResult(()=>db!.getAllAsync(this.query))
        .then(async (result)=>{


          let nextPage : number | null = null
          const previousPage = page > 1 ? page - 1 : null

          await _isThereNextPage()
          .then(()=>{
            nextPage = page + 1
          })
          .catch(()=>{})

          if(result.length){
            resolve({
              next: nextPage,
              //@ts-ignore
              nextPagination: nextPage ? ()=>this.pagination(nextPage as number,pageSize):null,
              previous: previousPage,
              //@ts-ignore
              previousPagination: previousPage ? ()=>this.pagination(previousPage,pageSize):null,
              results:result,
            })
          }else{
            if(page == 1){
              resolve({
                next: nextPage,
                //@ts-ignore
                nextPagination: nextPage ? ()=>this.pagination(nextPage as number,pageSize):null,
                previous: previousPage,
                //@ts-ignore
                previousPagination: previousPage ? ()=>this.pagination(previousPage,pageSize):null,
                results:result,
              })
            }else{
              reject('No results found')
            }
          }
        })
      }),
    })
  }

  public get = (id:number)=>{
    // if(this.lastMethod==="pagination"){
    //   // handle code
    // }
    this.lastMethod="get"
    return this.filter({id} as any).first(false) as ReturnType<this['first']>
  }


  public filter = (params?: FilterParams<InstanceWithId<S['fields']>>) : FilterReturnType<S>=>{
    // if(this.lastMethod==="pagination"){
    //   // handle code
    // }
    this.lastMethod="filter"

    let whereText = params ? this.model.getFilterQuery(params) : ''

    if (this.query){

      if(this.query.includes('WHERE')){
        whereText = whereText ? ` AND ${whereText}` : '';
      }else{
        whereText = whereText ? `WHERE ${whereText}` : '';
      }
      this.setQuery(`${this.query} ${whereText}`);
    }else{
      whereText = whereText ? `WHERE ${whereText}` : '';
      this.setQuery(`${this.queries().ALL} ${whereText}`);
    }

    return ({
      filter:this.filter.bind(this) as typeof this.filter,
      search:this.search.bind(this) as typeof this.search,
      pagination:this.pagination.bind(this) as typeof this.pagination,
      run:()=>this.getFinalListResult(()=>db!.getAllAsync(this.query)),
      query:this.getLastQuery,
      first:this.first.bind(this) as typeof this.first,
      last:this.last.bind(this) as typeof this.last,
      delete:this.delete.bind(this) as typeof this.delete,
      update:this.update.bind(this) as typeof this.update,
    })
  }


  public first(nullable=true){
    
    
    if (this.query){
      if(this.lastMethod==="pagination"){
        const OFFSET = this.query.split('OFFSET')[1]
        this.setQuery(`${this.query.split('LIMIT')[0]} ORDER BY id ASC LIMIT 1 OFFSET ${OFFSET}`)
      }else{
        this.setQuery(`${this.query} ORDER BY id ASC LIMIT 1`);
      }
    }else{
      this.setQuery(`${this.queries().ALL} ORDER BY id ASC LIMIT 1`);
    }

    this.lastMethod="first"
    
    return ({
      run:()=>this.getFinalSingleResult(()=>db!.getAllAsync(this.query),nullable),
      query:this.getLastQuery,
    })
  }

  public last(nullable=true){

    if(this.lastMethod==="pagination"){
      // handle code
    }
    
    if (this.query){
      if(this.lastMethod==="pagination"){
        const OFFSET = this.query.split('OFFSET')[1]
        this.setQuery(`${this.query.split('LIMIT')[0]} ORDER BY id DESC LIMIT 1 OFFSET ${OFFSET}`)
      }else{
        this.setQuery(`${this.query} ORDER BY id DESC LIMIT 1`);
      }
    }else{
      this.setQuery(`${this.queries().ALL} ORDER BY id DESC LIMIT 1`);
    }
    
    this.lastMethod="last"
    return ({
      run:()=>this.getFinalSingleResult(()=>db!.getAllAsync(this.query),nullable),
      query:this.getLastQuery,
    })
  }

  public delete(){
    if (this.query){
      this.setQuery(
        this.query
        .replace(this.queries().ALL,this.queries().DELETE)
      )
    }else{
      this.setQuery(this.queries().DELETE)
    }
    return ({
      run:()=>{
        const oldQuery = this.query
        this.clearQuery()
        return db!.runAsync(oldQuery)
      },
      query:this.getLastQuery,
    })
  }

  public update(data: Partial<S['fields']>){
    const fieldsToUpdate = Object.keys(data)
      .map((field_name) => {

        if(typeof data[field_name] == 'number'){
          return `${field_name} = ${data[field_name]}`
        }else{
          return `${field_name} = '${data[field_name]}'`
        }
      })
      .join(', ');
    
    if (this.query){
      this.setQuery(
        `${this.queries().UPDATE} ${fieldsToUpdate} ${this.query.replace(this.queries().ALL,'')}`
      )
    }else{
      this.setQuery(`${this.queries().UPDATE} ${fieldsToUpdate}`)
    }
    
    return ({
      run:()=>this.model.checkForiegnKeys(data)
      .then(()=>{
          const oldQuery = this.query
          this.clearQuery()
          return db!.runAsync(oldQuery)
      }),
      query:this.getLastQuery,
    })
  }

  public create(data: S['fields']){

    this.setQuery(this.queries().CREATE(
      Object.keys(data),
      Object.keys(data).map(key => {
        if(typeof data[key] == 'number'){
          return `${data[key]}`
        }else{
          return `'${data[key]}'`
        }
      })
    ));

    
    return ({
      run:()=>this.model.checkForiegnKeys(data)
      .then(
        ()=>db!.runAsync(this.query)
        .then(el=>{
          this.clearQuery()
          return this.get(el.lastInsertRowId).run()
        })
      ),
      query:this.getLastQuery,
    })
  }

  private getLastQuery = ()=>{
    this.lastMethod=""
    const oldQuery = this.query
    this.clearQuery()
    return oldQuery
  }
  

  private async getFinalListResult(func:()=>Promise<unknown[]>){
    this.lastMethod=""
    return new Promise<InstanceWithOps<S>[]>(async(resolve, reject)=>{
      await func()
      .then(result=>{
        this.clearQuery();
        
        resolve(result.map((el)=>{
          const item = el as InstanceWithId<S['fields']>
          return ({
            ...item as any,
            delete :()=>this.get(item.id).run().then(()=>this.filter({id:item.id} as any).delete().run()),
            update:(data:Partial<S['fields']>)=>this.get(item.id).run()
            .then(()=>this.filter({id:item.id} as any).update(data).run()
            .then(()=>this.get(item.id).run())),
            children: (table)=> {
              const obj = this.model.getChildren()[table]
              return obj.table.objects.filter({[obj.fieldName]:item.id} as any)
            },
            parent:(table)=> {
              const obj = this.model.getParents()[table]
              return obj.table.objects.get(item.id)
            }
          })
        }));
      })
      .catch(error=>{
        this.clearQuery();
        reject(error);
      })
  
    })
  }

  private async getFinalSingleResult(func:()=>Promise<unknown[]>,nullable:boolean){
    this.lastMethod=""
    return new Promise<InstanceWithOps<S>| null>(async(resolve, reject)=>{
      await func()
      .then(result=>{
        this.clearQuery();
        if(result.length > 0){
          const item = result[0] as InstanceWithId<S['fields']>
          resolve({
            ...item as any,
            delete:()=>this.get(item.id).run().then(()=>this.filter({id:item.id} as any).delete().run()),
            update: (data:Partial<S['fields']>)=>this.get(item.id).run()
            .then(()=>this.filter({id:item.id} as any).update(data).run()
            .then(()=>this.get(item.id).run())),
            children: (table)=> {
              const obj = this.model.getChildren()[table]
              return obj.table.objects.filter({[obj.fieldName]:item.id} as any)
            },
            parent:(table)=> {
              const obj = this.model.getParents()[table]
              return obj.table.objects.get(item.id)
            }
          });
        }else{
          if(nullable) resolve(null);
          else reject(new Error('No result found'));
        }
        
      })
      .catch(error=>{
        this.clearQuery();
        reject(error);
      })
  
    })
  }
}


export class SQLiteModel<S extends SQLiteModelSchemaType> {
  tableName!: string;

  constructor(){
    
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

  initTable(): Promise<SQLite.SQLiteRunResult> {
    if(!db) throw new Error("Cannot initialize this table without a database");
    if(!this.tableName) throw new Error("Cannot initialize this table without a table name");
    const foriegnKeysQueries: string[] = [];
    const fieldsQueries: string[] = Object.keys(this.getFields())
    .map(
      (fieldName) => {
        const field = this.getFields()[fieldName];
        if (field.foriegnKeyTable) {
          foriegnKeysQueries.push(
            `FOREIGN KEY(${fieldName}) REFERENCES ${field.foriegnKeyTable.tableName}(id)`,
          );
          return `${fieldName}  INTEGER `;
        }
        return `${fieldName} ${field.type} ${
          field.required ? 'NOT NULL' : ''
        } ${field.unique ? 'UNIQUE' : ''}`;
      },
    );
    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${
      this.tableName
    } (id INTEGER PRIMARY KEY AUTOINCREMENT, ${fieldsQueries.join(', ')}${
      foriegnKeysQueries.length > 0 ? ', ' : ''
    } ${foriegnKeysQueries.join(',')})`;
    console.log(
      this.tableName,
      'table created =========================================================',
    );
    console.log(createTableQuery);

    return db.runAsync(createTableQuery)
  }

  getSchema(): SQLiteModelSchema<S> {
    throw new Error('Model must implement getSchema method')
  }

  getFields(){
    return this.getSchema()['fields']
  }

  getChildren(){
    return this.getSchema()['children']
  }

  getParents(){
    return this.getSchema()['parents']
  }

  getForeignKeysFieldsNames() {
    const foriegnKeysFieldsNames: string[] = [];
    Object.keys(this.getFields())
    .forEach((fieldName) => {
      const field = this.getFields()[fieldName];
      if (field.foriegnKeyTable) {
        foriegnKeysFieldsNames.push(fieldName);
      }
    });
    return foriegnKeysFieldsNames;
  }

  getSearchQuery(search: string) {
    const searchFieldsNames: string[] = [];
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

  getFilterQuery(params: FilterParams<InstanceWithId<S['fields']>>) {
    const _getFilterQuery = (_params: FilterParams<S['fields']>) => {
      const _whereQueries: string[] = [];

      const keys = Object.keys(_params) as (keyof typeof _params)[];

      keys.forEach((key, index) => {
        if (key === 'AND') {
          _whereQueries.push(
            this.getFilterQuery(_params[key] as FilterParams<InstanceWithId<S['fields']>>),
          );
        } else if (key === 'OR') {
          _whereQueries.push(
            this.getFilterQuery(_params[key] as FilterParams<InstanceWithId<S['fields']>>),
          );
        } else {
          const [fieldName, lookUp] = (key as string).split('__');
          const value = _params[key];
          if (lookUp && value) {
            if (lookUp === 'lte') {
              if (typeof value === 'number')
                _whereQueries.push(` ${fieldName} <= ${value} `);
            } else if (lookUp === 'gte') {
              if (typeof value === 'number')
                _whereQueries.push(` ${fieldName} >= ${value} `);
            } else if (lookUp === 'in') {
              if (typeof value === 'number') {
                _whereQueries.push(` ${fieldName} in (${value}) `);
              } else if (typeof value === 'string') {
                _whereQueries.push(` ${fieldName} in ('${value}') `);
              } else if (value.toString().length > 0) {
                _whereQueries.push(
                  ` ${fieldName} in (${(value as any[]).map((item) =>
                    typeof item === 'number' ? `${item} ` : `'${item}' `,
                  )}) `,
                );
              }
            } else if (lookUp === 'contains') {
              _whereQueries.push(` ${fieldName} LIKE '%${value.toString()}%' `);
            } else if (lookUp === 'icontains') {
              _whereQueries.push(
                ` LOWER(${fieldName}) LIKE '%${value.toString()}%' `,
              );
            }
          } else if (typeof value === 'number') {
            _whereQueries.push(` ${fieldName} = ${value} `);
          } else {
            _whereQueries.push(` ${fieldName} = '${value}' `);
          }
        }
      });

      return _whereQueries;
    };
    const whereQueries: string[] = [];

    const keys = Object.keys(params) as (keyof typeof params)[];

    keys.forEach((key, index) => {
      if (key === 'AND') {
        whereQueries.push(
          ` (${_getFilterQuery(params[key] as FilterParams<S['fields']>).join(
            ' AND ',
          )}) `,
        );
      } else if (key === 'OR') {
        whereQueries.push(
          ` (${_getFilterQuery(params[key] as FilterParams<S['fields']>).join(' OR ')}) `,
        );
      } else {
        const [fieldName, lookUp] = (key as string).split('__');
        const value = params[key] as number | string | string[] | number[];
        if (lookUp) {
          if (lookUp === 'lte') {
            if (typeof value === 'number')
              whereQueries.push(` ${fieldName} <= ${value} `);
          } else if (lookUp === 'gte') {
            if (typeof value === 'number')
              whereQueries.push(` ${fieldName} >= ${value} `);
          } else if (lookUp === 'in') {
            if (typeof value === 'number') {
              whereQueries.push(` ${fieldName} in (${value}) `);
            } else if (typeof value === 'string') {
              whereQueries.push(` ${fieldName} in ('${value}') `);
            } else if (value.toString().length > 0) {
              whereQueries.push(
                ` ${fieldName} in (${value.map((item) =>
                  typeof item === 'number' ? `${item} ` : `'${item}'`,
                )}) `,
              );
            }
          } else if (lookUp === 'contains') {
            whereQueries.push(` ${fieldName} LIKE '%${value.toString()}%' `);
          } else if (lookUp === 'icontains') {
            whereQueries.push(
              ` LOWER(${fieldName}) LIKE '%${value.toString()}%' `,
            );
          }
        } else if (typeof value === 'number') {
          whereQueries.push(` ${fieldName} = ${value} `);
        } else {
          whereQueries.push(` ${fieldName} = '${value}' `);
        }
      }
    });

    return whereQueries.join(' AND ');
  }

  async checkForiegnKeys(_data: Partial<S['fields']>){
    const foriegnKeysFieldsNames = this.getForeignKeysFieldsNames();

    if (foriegnKeysFieldsNames.length > 0) {
      const allForeignKeysNotExists: string[] = [];
      for (const fieldName of foriegnKeysFieldsNames) {
        const field = this.getFields()[fieldName];

        if (field.foriegnKeyTable) {
          try {
            if (_data[fieldName])
              await field.foriegnKeyTable.objects.filter({id:_data[fieldName ] as number}).first(false);
          } catch (error) {
            console.log('Foreign key(s) does not exist', fieldName);
            allForeignKeysNotExists.push(fieldName);
          }
        }
      }

      if (allForeignKeysNotExists.length > 0) {
        throw Error(
          `Foreign key(s) : << ${allForeignKeysNotExists
            .map((el) => `${el}:${_data[el]}`)
            .toString()} >> does not exist`,
        );
      }
    }
  };

  public objects = new SQLiteManager<S>(this)
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


type SQLiteColumnTypes = 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'BOOLEAN' ;

export type SQLiteModelSchemaType = {
  fields:{
    [x: string]:any
  },
  children: {
    [x:string]:SQLiteModel<any>
  },
  parents: {
    [x:string]:SQLiteModel<any>
  }
}

export type SQLiteModelSchema<Schema extends SQLiteModelSchemaType> = {
  fields:{
    [key in keyof Schema['fields']]: {
      type: SQLiteColumnTypes;
      required?: boolean;
      unique?: boolean;
      foriegnKeyTable?: SQLiteModel<any>;
      useInSearch?: boolean;
    };
  };
  children: {
    [key in keyof Schema['children']]:{
      table:SQLiteModel<any> ;
      fieldName:string ;
    }
  };
  parents: {
    [key in keyof Schema['parents']]:{
      table:SQLiteModel<any> ;
      fieldName:string ;
    }
  }
}



export type InstanceWithId<T extends SQLiteModelSchemaType['fields']> = T & {id:number}
export type InstanceWithOps<S extends SQLiteModelSchemaType> = (
  S['fields'] & {
    id:number ;
    delete:()=>ReturnType<ReturnType<SQLiteModel<S>['objects']['delete']>['run']> ;
    update:(data:Partial<S['fields']>)=>ReturnType<ReturnType<SQLiteModel<S>['objects']['get']>['run']> ;
    children:<K extends keyof S['children'] >(table:K) => ReturnType<S['children'][K]['objects']['filter']>
    parent:<K extends keyof S['parents'] >(table: K ) => ReturnType<S['parents'][K]['objects']['get']>
  }
  // &{
  //   [k in string as keyof S['children'] extends never ? never : 'children']:(table: keyof S['children'] ) => ReturnType<S['children'][typeof table]['objects']['filter']>
  // }
)




// this type IS VERY REQUIRED for apply K extends `${infer _U}__in` in FilterLookups for control type of value for each lookup
export type FilterLookups_JUST_FOR_CORRECT_KEYS<T> = {
  [K in keyof T as `${Extract<K, string>}${T[K] extends number
    ? '' | '__lte' | '__gte' | '__in' | '__contains'
    : T[K] extends boolean
    ? '' | '__in'
    : '' | '__in' | '__contains'}`]: T[K];
};

export type FilterLookups<T> = {
  [K in keyof FilterLookups_JUST_FOR_CORRECT_KEYS<T>]: K extends `${infer _U}__in`
    ? FilterLookups_JUST_FOR_CORRECT_KEYS<T>[K][]
    : FilterLookups_JUST_FOR_CORRECT_KEYS<T>[K];
};

export type FilterParams<T> = {
  [KEY in keyof FilterLookups<T> | 'AND' | 'OR']?: KEY extends 'OR' | 'AND'
    ? FilterParams<T>
    : FilterLookups<T>[KEY extends keyof FilterLookups<T> ? KEY : never];
};