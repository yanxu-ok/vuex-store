//只对v-model 过或者文本 new一个观察者watcher  【重点】当 new watcher的时候会先调用取值的方法，先把自己(this)放到
//全局dep（被观察者）， 取值就到了数据劫持的get（）方法中，为每一个属性（数据）添加对应的watcher（Dep.terget）到自己的dep中（这样就形成了订阅），
//这样就把watcher（观察者）和对应的属性（数据）关联起来,当数据变化后然后调用自己的dep中notify方法通知视图（发布）。 
//但是现在视图修改还不能通知数据 ，所以在CompilerUtil.model中在添加事件

//coputed 属性是模板识别{{}}当中的表达式，然后添加watcher然后取值然后到computed的数据劫持中得到return函数，
//然后执行return函数 this.myname.age+ ''  然后取值添加watcher，将表达式绑定在数据上，当数据一变然后表达式就变

//methods  当点击按钮的时候执行 vm的函数，然后到了方法的数据劫持执行函数，然后进行改值，然后执行对应的notify更改视图

class Dep { //里面存放了所有的观察者 到时候数据一变就通知所有的观察者  
    constructor() {
        this.subs = [] //存放所有 new 的watcher
    }
    //订阅
    addSub(watcher) { //暴露一个方法添加watcher 
        this.subs.push(watcher)
    }
    //发布 通知 调用观察者的数据更新方法
    notify() {
        this.subs.forEach(watcher => watcher.updata())
    }
}

//观察者  (发布订阅)  观察者  被观察者
//建立一个观察者
class Watcher {
    constructor(vm, expr, callback) { //vm 当前实例  expr 表达式   callbac  回调函数
        //为了其他方法能够调用vm的实例
        this.vm = vm,
            this.expr = expr,
            this.callback = callback
        //要想监测到data中的值 默认先存放一个老值 定义一个获取老值的方法
        this.oldValue = this.get();
    }
    get() { // 每次取值都会去Observer中去取值
        //取值 把这个观察者 和数据关联起来
        Dep.terget = this // 创建watcher时 会先把自己挂到全局Dep类中的属性中在下面的去取值get方法中在调用dep
        // 类的addsub方法将自己添加到subs数组中，然后等到数据变化时然后就可以执行自己的updata方法
        let value = CompilerUtil['getData'](this.expr, this.vm)
        Dep.terget = null // 取完值清空
        return value
    }
    updata() { //更新操作 数据变换后 会调用观察者的updata方法
        let newVal = CompilerUtil['getData'](this.expr, this.vm)
        if (newVal !== this.oldValue) { //先判断新值和旧值相等不相等
            this.callback(newVal)
        }
    }
}
// vm.$watch(vm,'myname.name',(newVal)=>{
// })

//在编译前实现数据劫持
class Observer {
    constructor(data) {
        this.observer(data);
    }
    observer(data) {
        //如果是对象才观察
        if (data && typeof data == 'object') {
            for (const key in data) {
                this.defineReactive(data, key, data[key]);
            }
        }
    }
    defineReactive(obj, key, value) {
        //如果里面的还有对象就深度递归
        this.observer(value)

        let dep = new Dep() // 【关键】 给每一个属性 都加上一个具有发布订阅的功能 
        Object.defineProperty(obj, key, {
            get() {
                Dep.terget && dep.addSub(Dep.terget)
                // 创建watcher时 会先把自己（this）挂到全局Dep类中的属性中在下面的去取值get方法中在调用dep
                // 类的addsub方法将自己添加到对应数据的dep中
                //将当前变量对应的watcher存放到dep中的subs数组中
                return value
            },
            set: (newVal) => {
                if (newVal != value) {
                    //如果赋值的是对象则需要再调用一次observer
                    this.observer(newVal)
                    value = newVal
                    dep.notify() //当数据变化时调用自己的watcher的updata（）再次获取最新值 然后执行视图更新 这样就实现了数据变化通知了试图
                }

            }
        })
    }
}

// 负责编译模板的类
class Compiler {
    constructor(el, vm) {
        // 判断 el属性 是不是一个Dom元素 如果不是元素 那就获取他
        this.el = this.IsElementNode(el) ? el : document.querySelector(el);
        // console.log(this.el)  //el元素中的内容

        //每个类都要进行赋值以拿到vm对象实例，因为要用到data
        this.vm = vm

        //再把当前节点中的元素 获取到 放到内存中
        let fragment = this.node2fragment(this.el)

        //编译模板 用数据编译
        this.compile(fragment);

        //把内容塞到页面中
        this.el.appendChild(fragment)
    }
    //判断是否是带v-
    IsDirective(attrName) {
        return attrName.startsWith('v-');
    }
    //编译元素的
    compileElement(node) {
        let attributes = node.attributes; //获取元素所有的属性
        // console.log([...attributes]); //类数组
        [...attributes].forEach(attr => {
            let {
                name,
                value: expr
            } = attr;
            // console.log(name, value)
            if (this.IsDirective(name)) {
                let [, directive] = name.split('-');
                // CompilerUtil[directive](node, expr, this.vm); //解析v-model的
                let [directiveName, eventName] = directive.split(':');
                CompilerUtil[directiveName](node, expr, this.vm, eventName); //解析v-on:click事件的               
            }
        })
    }

    //编译文本的
    compileText(node) { //判断当前文本节点中内容是否包含{{}}
        let content = node.textContent;
        if (/\{\{(.+?)\}\}/.test(content)) {
            CompilerUtil['test'](node, content, this.vm);
        }
    }

    //核心的编译方法
    compile(node) { //用来编译内存中的Dom节点
        let childNodes = node.childNodes;
        // console.log(childNodes); 所有孩子节点
        [...childNodes].forEach(child => { //转换为数组
            if (this.IsElementNode(child)) {
                this.compileElement(child);
                //如果是元素的话 需要把自己传进去，再去遍历子节点
                this.compile(child);
            } else {
                this.compileText(child)
            }
        })
    }
    //把节点内容放到内存中
    node2fragment(node) {
        //先创建一个文档碎片
        let fragment = document.createDocumentFragment();
        let tmpChild;
        while (tmpChild = node.firstChild) {
            //appendChild 具有移动性
            fragment.appendChild(tmpChild);
        }
        return fragment
    }
    //判断el是否位元素节点
    IsElementNode(node) {
        return node.nodeType === 1;
    }
}

CompilerUtil = {
    //获取$data中的数据
    //根据表达式取到对应的数据  expr是 myname.name  所以要用循环遍历对象
    //分割之后变成[myname,name]
    getData(expr, vm) {
        return expr.split('.').reduce((data, currect) => {
            return data[currect];
        }, vm.$data)
    },
    // 修改数据的方法
    setData(expr, vm, value) { // {{myname.name}}
        expr.split('.').reduce((data, currect, index, arr) => {
            if (index == arr.length - 1) {
                return data[currect] = value;
            }
            return data[currect]
        }, vm.$data)
    },
    //解析事件的
    on(node, expr, vm, eventName) { //  v-on:click = "change"  expr就是change
        node.addEventListener(eventName, (e) => {
            vm[expr].call(vm, e);
        })
    },
    //解析v-model指令
    model(node, expr, vm) { //node 是节点  expr是表达式  vm 是传过来的vm实例
        let fn = this.updater['modelUpdater'];
        // 给输入框加一个观察者 如果稍后data数据更新了会触发此方法，会拿新值给输入框赋予值
        new Watcher(vm, expr, (newVal) => {
            fn(node, newVal)
        });
        //每次在输入框中输入值都会先获取值，然后调用setData方法进行赋值，数据一变然后视图也变。
        node.addEventListener('input', (e) => {
            let value = e.target.value //获取用户输入的内容
            this.setData(expr, vm, value)
        })

        let value = this.getData(expr, vm);
        fn(node, value)
    },
    //和解析model差不多
    html(node, expr, vm) {
        let fn = this.updater['htmlUpdater'];
        new Watcher(vm, expr, (newVal) => {
            fn(node, newVal)
        });
        let value = this.getData(expr, vm);
        fn(node, value)
    },
    getContentValue(vm, expr) {
        // 遍历表达式 将内容重新替换成一个完整的内容 返还回去
        return expr.replace(/\{\{(.+?)\}\}/, (...args) => {
            return this.getData(args[1], vm)
        })
    },
    test(node, expr, vm) { //expr => {{a}} {{b}} {{c}}
        let fn = this.updater['test'];
        let content = expr.replace(/\{\{(.+?)\}\}/, (...args) => {
            // 给每个{{}} 都加上观察者
            new Watcher(vm, args[1], () => {
                fn(node, this.getContentValue(vm, expr)) //返回了一个完整的字符串
            })
            return this.getData(args[1], vm)
        });
        fn(node, content);
    },
    updater: {
        //将数据插入到节点中
        modelUpdater(node, value) {
            node.value = value;
        },
        //编译文本的
        test(node, value) {
            node.textContent = value;
        },
        htmlUpdater(node, value) {
            node.innerHTML = value
        }
    }
}
// 基类 只负责调度
class Vue {
    //构造函数
    constructor(options) { // options是new VUE的当中定义的参数
        this.$el = options.el; // this 是 new Vue 的对象
        this.$data = options.data;

        let computed = options.computed;

        let methods = options.methods;
        //先判断这个根元素  存在  编译模板div  然后定义一个类专门编译
        if (this.$el) {

            //在 编译前 把data 全部转换为成用Object.definePropery来定义  实现数据劫持
            new Observer(this.$data);

            // {{getNewname}} reduce  vm.$data.getNewname
            for (const key in computed) { //computed数据劫持
                Object.defineProperty(this.$data, key, { //当匹配到这个键是会执行对应的return函数 ， 然后取值
                    //对这个数据添加watcher
                    get: () => {
                        return computed[key].call(this);
                    }
                })
            }

            for (const key in methods) { //methods的数据劫持
                Object.defineProperty(this, key, {
                    get() {
                        return methods[key];
                    }
                })
            }

            //把数据获取操作 vm上的取值操作 都代理到  vm.$data
            this.proxyVm(this.$data)

            //调用编译的类
            new Compiler(this.$el, this);
        }
    }
    //代理
    proxyVm(data) {
        for (const key in data) {
            Object.defineProperty(this, key, { //实现了可以通过vm取到对应的内容
                get() {
                    return data[key] //进行了转换操作
                },
                set(newVal) {
                    data[key] = newVal
                }
            })
        }
    }
}


//mvvm响应式原理  怎么阐述
//vue是采用数据劫持配合发布者-订阅者(观察者模式)方式，通过Onject.definerProperty()来劫持各个属性的setter和getter，
//在数据变动时， 发布消息给依赖收集器去通知观察者，做出对应的回调函数去更新视图

// MVVM 作为绑定的入口  整合了Observer和Compile和watcher 三者，通过onserver来监听数据变化，通过compiler来解析编译模板指令
// 最终利用watcher搭起Observer和Compile的之间通信的桥梁，达到数据变化->视图更新，视图交互变化-》数据model更新的双向绑定效果