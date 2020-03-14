let vue; //vue 的构造函数
//vue 的组件渲染  先渲染父组件 在渲染子组件
const install = (_Vue) => {
    vue = _Vue; //_vue 是vue 的构造函数
    //需要给每个组件都注册一个this.$score的属性
    //所以这里需要使用全局混入
    vue.mixin({
        beforeCreate() { //生命周期 组件创建之前
            //需要先判别是父组件还是子组件，如果是子组件，应该把父组件的store增加给子组件
            if (this.$options && this.$options.store) { //如果符合就是父组件 然后
                this.$store = this.$options.store;
            } else { //否则的话就是子组件
                this.$store = this.$parent && this.$parent.$store;
            }
        }
    })
}
//收集的类
class ModuleCollection {
    constructor(options) {
        this.register([], options);
    }
    register(path, rootModule) { //[a,c]  {}
        let newModule = {
            _raw: rootModule,
            _children: {},
            state: rootModule.state
        }
        if (path.length === 0) {
            this.root = newModule // 说明这个就是根state
        } else {
            // [a,c,b] slice 数组方法取最后前一位 root 初始值，currect当前值
            let parent = path.slice(0, -1).reduce((root, currect) => {
                //[a] 有一个字符串的时候path.slice(0, -1)为空，直接返回this.root，如果[a,c]返回a, 就是返回数组的前一个字符为父类
                return this.root._children[currect]
            }, this.root)
            //先找出父节点
            //否则的话就把父节点的_children  //[a]  每次都需要数组的最后一个元素当键，这时候造成一个问题，这时候所有的父节点都是this.$root,所以先找出父节点来
            // this.root._children[path[path.length - 1]] = newModule
            // console.log(parent)
            parent._children[path[path.length - 1]] = newModule //赋值操作
        }
        //判断是否有没有modules 
        if (rootModule.modules) {
            //如果有则循环遍历递归
            Object.keys(rootModule.modules).forEach(moduleName => {
                this.register(path.concat(moduleName), rootModule.modules[moduleName])
            })
        }

    }
}

//递归树，将结果挂载  getters  mutations actions
const installModule = (store, state, path, rootModule) => {

    //先判断是否是子模块 加到父亲的模块后
    if (path.length > 0) { //如果大于零就是 子模块
        let parent = path.slice(0, -1).reduce((state, currect) => { //找出父模块
            return state[currect]
        }, state);
        //找出父模块，然后在父模块里面进行加子模块 动态的添加
        vue.set(parent, path[path.length - 1], rootModule.state);
        // path[path.length - 1] 键  rootModule.stat 当前的值
    } 
    
    //先处理模块的getters属性
    let getters = rootModule._raw.getters;
    if (getters) {
        Object.keys(getters).forEach(getterName => {
            Object.defineProperty(store.getters, getterName, {
                get: () => {
                    return getters[getterName](rootModule.state)
                    //这里是把当前模块的state传过去
                }
            })
        })
    }
    //处理mutations
    let mutations = rootModule._raw.mutations;
    if (mutations) {
        Object.keys(mutations).forEach(mutationName => {
            let arr = store.mutations[mutationName] || (store.mutations[mutationName] = [])
            arr.push((pyload) => {
                mutations[mutationName](rootModule.state, pyload); //将当前模块的状态进行
            })
            //这里拿到的每一项都是数组然后把执行的函数加进函数中，这样commit拿到的每一项都是数组
            // console.dir(arr)
        })
    }
    //处理actions
    let actions = rootModule._raw.actions;
    if (actions) {
        Object.keys(actions).forEach(actionName => {
            let arr = store.actions[actionName] || (store.actions[actionName] = [])
            arr.push((pyload) => {
                actions[actionName](store, pyload);
            })
        })
    }
    //上面的这些都是给一层加的
    //所以还要给所有的模块加  所以还要循环递归
    // console.log(rootModule._children)
    Object.keys(rootModule._children).forEach(moduleName => {
        //store this.$store   [a] rootModule._children[moduleName] 当前的模块
        installModule(store, state, path.concat(moduleName), rootModule._children[moduleName])
    })
}

class Store {
    constructor(options) {
        //但是现在有一个问题 当修改组件中的值数据视图不更新，所以可以把state的加get setter
        this._s = new vue({
            data: {
                state: options.state //把对象变成了可以监控的对象
            }
        });
        // let getters = options.getters;
        this.getters = {};
        // Object.keys(getters).forEach(getName => {
        //     //使用 Object.defineProperty 监听getter里面的属性，当访问getter里面的值时执行函数
        //     Object.defineProperty(this.getters, getName, {
        //         get: () => {
        //             return getters[getName](this.state);
        //         }
        //     })
        // });

        // let mutations = options.mutations;
        this.mutations = {};
        //把mutations放到this.mutations上
        // Object.keys(mutations).forEach(mutationName => {
        //     this.mutations[mutationName] = (pyload) => {
        //         mutations[mutationName].call(this, this.state, pyload)
        //     }
        // });

        // let actions = options.actions; //会调用 
        this.actions = {};
        // Object.keys(actions).forEach(actionName => {
        //     this.actions[actionName] = (pyload) => {
        //         //第一个this代表当前实例，二个是传入的this.$score
        //         actions[actionName].call(this, this, pyload) //call() 可以直接在定时器里面打印this
        //     }
        // });
        //关于模块   先把传过来的数据进行格式化
        //  let root = {
        //      _raw :rootModule,
        //      state:{age:10},
        //      _children:{
        //          a:{
        //              _raw = aModule,
        //              _children :{},
        //              state:{x:1}
        //          },
        //          b:{
        //              _raw = bModule,
        //              _children :{},
        //              state:{y:1}
        //          }
        //      }
        //先收集模块  所有的收集起来   所以上面写的针对一个的就都可以注释
        this.modules = new ModuleCollection(options);
        console.log(this.modules, options)
        // this.$store  包含着  getters muttions
        installModule(this, this.state, [], this.modules.root); //安装模块
    }

    dispatch = (type, pyload) => {
        // this.actions[type](pyload); //找到对应的action执行，然后执行内部的commit函数
        this.actions[type].forEach(fn => fn(pyload));
    }
    //同步操作
    //当每个组件调用commit的时候会调用mutations对应type的函数
    commit = (type, pyload) => {
        // this.mutations[type](pyload); 
        this.mutations[type].forEach(fn => fn(pyload)); //当递归遍历后这里应该拿到的是数组 周星星函数
    }
    get state() { //属性访问器，当访问state时执行方法
        return this._s.state //这个this._s时代理到 data上了
    }
}
export default {
    install,
    Store
}