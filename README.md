# start your unique experience with AN-EXPO-SQLITE-ORM

`npm i an-expo-sqlite-orm` or `yarn add an-expo-sqlite-orm`

### db/models/todo.ts

```
import { SQLiteModel, SQLiteModelSchema } from "an-expo-sqlite-orm";

export interface TodoFields {
  title: string;
  completed: boolean;
}

export interface TodoSchema {
    fields: TodoFields,
    children:{},
    parents:{}
}



export class TodoModel extends SQLiteModel<TodoSchema> {
    getSchema(): SQLiteModelSchema<{ fields: TodoFields; children: {}; parents: {}; }> {
        return {
            fields:{
                title: {type:'TEXT'},
                completed: {type: 'BOOLEAN'},
            },
            children: {},
            parents: {},
        }
    }
}
```



### db/init.ts

```
import { initDatabase, resetDatabase, SQLiteModel } from "an-expo-sqlite-orm";
import { TodoModel } from "./models/todo";

export const models: SQLiteModel<any>[] = [
  new TodoModel()
];

export default (() => {
  return initDatabase(models);
  return resetDatabase(models);
})();
```

### import init.ts file in start file (app.tsx)

`import './db/init'`

# How working
### you can import **TodoModel** for example and:

```
const todo = new TodoModel()

// todo.objects.[method].run() run is Promise return value depends on [method]
```

### create
```
todo.objects.create({
  // todo object
}).run().then((newCreateItem)=>{
  console.log('item created' , newCreateItem)
})
```

### update
```
todo.objects.filter({id:[id:number]}).update({
  // todo object
}).run().then((val:SQLite.SQLiteRunResult)=>{
  console.log(val)
})
```

### delete
```
todo.objects.filter({id:[id:number]}).delete().run().then((val:SQLite.SQLiteRunResult)=>{
  console.log(val)
})
```

### first or last
```
todo.objects.first().run().the(item=>{
  console.log('first item', item)
}).catch(()=>{
  // item is not found
})
```

### search
```
// in todo getSchema fields add useSearch:true in any field you want to search

todo.objects.search('hello').run().the(items=>{
  console.log('items', items)
})
```

### pagination
```
todo.objects.pagination(1,20).run().the(items=>{
  console.log('items of page 1 if pageSize is 20', items)
})
```

### InstanceWithOps<Schema>

this type is so important if you use any method return that you can **update** or **delete** the single instance or get **parent** or **children** too