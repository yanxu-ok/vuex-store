import Vue from 'vue'
import Vuex from './vuex'

Vue.use(Vuex, 123) //用插件  会默认调用这个库的install方法

export default new Vuex.Store({
  state: {
    age: 19
  },
  mutations: {
    sync(state, pyload) {
      state.age += pyload
    }
  },
  actions: {
    async ({
      commit,
      dispatch
    }, pyload) {
      setTimeout(() => {
        commit('sync', pyload)
      }, 1000);
    }
  },
  modules: {
    a: {
      state: {
        x: 1
      },
      mutations:{
        sync(state, pyload) {
          console.log('aaaa')
        }
      },
      modules: {
        c: {
          state: {
            z: 1
          }
        }
      }
    },
    b: {
      state: {
        y: 1
      }
    }
  },
  getters: { //data的computed
    myage(state) {
      return state.age + 10
    }
  }
})