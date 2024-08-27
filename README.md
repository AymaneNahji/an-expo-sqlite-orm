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

### import init.ts file in start file

`import './init'`