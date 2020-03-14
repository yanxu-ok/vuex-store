<template>
  <div>
    11111 {{this.$store.state.age}}
    <div>{{this.$store.getters.myage}}</div>
    {{this.$store.state.a.x}}
    <div>
      <button value="dianji" @click="add"></button>
      <button value="dianji" @click="async"></button>
    </div>
  </div>
</template>
<script>
export default {
  name: "app",
  data() {
    return {};
  },
  methods: {
    add() {
       this.$store.commit('sync',10)
    },
    async(){
      this.$store.dispatch('async',10)
    }
  },
  mounted() {
    this.$store.state.age = 100;
    // console.log(this);
  }
};
</script>

<style>
</style>
