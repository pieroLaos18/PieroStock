<!-- Vista principal de registro, muestra el formulario de registro de usuario -->

<template>
  <div class="register-view">
    <!-- Componente de formulario de registro -->
    <RegisterForm />
  </div>
</template>

<script>
// Importa el componente de formulario de registro
import RegisterForm from '../components/RegisterForm.vue';

export default {
  // Registra el componente RegisterForm
  components: {
    RegisterForm,
  },
};
</script>

<style scoped>
/* La tarjeta de autenticación controla su propio centrado y espaciado. */
.register-view {
  width: 100%;
  min-height: 100vh;
  margin: 0;
  text-align: left;
}
</style>
