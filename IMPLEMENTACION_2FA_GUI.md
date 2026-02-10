# Tutorial: Implementación de Checkbox 2FA en GUI

## Introducción

En este tutorial implementaremos un sistema de discriminación de 2FA por usuario directamente desde la interfaz web, permitiendo habilitar/deshabilitar la autenticación de dos factores de forma individual sin necesidad de acceder a la consola.

## Objetivo

Crear una interfaz intuitiva donde los administradores puedan:
- Crear usuarios con o sin 2FA
- Activar/desactivar 2FA en usuarios existentes
- Visualizar el estado de 2FA de cada usuario

## Implementación

### Backend (Go)

#### 1. Extender estructura de usuario

Primero agregamos un campo a la estructura `OpenvpnClient` para trackear el estado de 2FA:

```go
type OpenvpnClient struct {
    Identity         string `json:"Identity"`
    AccountStatus    string `json:"AccountStatus"`
    ExpirationDate   string `json:"ExpirationDate"`
    RevocationDate   string `json:"RevocationDate"`
    ConnectionStatus string `json:"ConnectionStatus"`
    Connections      int    `json:"Connections"`
    TwoFAEnabled     bool   `json:"TwoFAEnabled"`  // ← Nuevo campo
}
```

#### 2. Modificar función usersList()

Actualizamos la función para detectar automáticamente si un usuario tiene 2FA:

```go
// Check if user has 2FA enabled
if _, err := os.Stat(fmt.Sprintf("%s/%s", *googleAuthDir, ovpnClient.Identity)); err == nil {
    ovpnClient.TwoFAEnabled = true
} else {
    ovpnClient.TwoFAEnabled = false
}
```

#### 3. Actualizar userCreate()

Modificamos la firma para aceptar el parámetro de 2FA:

```go
func (oAdmin *OvpnAdmin) userCreate(username, password string, enable2FA bool) (bool, string) {
    // ... lógica existente ...
    
    if *googleAuth2FAEnabled && enable2FA {
        mfa_auth := runBash(fmt.Sprintf("/etc/openvpn/google-auth.sh %s", username))
        log.Debug(mfa_auth)
    }
}
```

#### 4. Crear endpoint para toggle 2FA

Agregamos un nuevo handler para gestionar el cambio de estado:

```go
func (oAdmin *OvpnAdmin) userToggle2FAHandler(w http.ResponseWriter, r *http.Request) {
    username := r.FormValue("username")
    enable := r.FormValue("enable") == "true"
    
    if enable {
        // Enable 2FA
        mfa_auth := runBash(fmt.Sprintf("/etc/openvpn/google-auth.sh %s", username))
        fmt.Fprintf(w, `{"msg":"2FA enabled for user %s"}`, username)
    } else {
        // Disable 2FA
        authFile := fmt.Sprintf("%s/%s", *googleAuthDir, username)
        os.Remove(authFile)
        fmt.Fprintf(w, `{"msg":"2FA disabled for user %s"}`, username)
    }
}
```

### Frontend (Vue.js)

#### 1. Agregar campo en el modal

Añadimos el checkbox en el modal de creación:

```html
<div class="form-check modal-el-margin" v-if="modulesEnabled.includes('google-auth-2fa')">
  <input type="checkbox" class="form-check-input" id="newUser2FA" v-model="u.newUser2FA">
  <label class="form-check-label" for="newUser2FA">
    Enable 2FA (Google Authenticator)
  </label>
</div>
```

#### 2. Modificar función createUser()

Actualizamos para enviar el parámetro enable2fa:

```javascript
createUser: function() {
  var data = new URLSearchParams();
  data.append('username', _this.u.newUserName);
  data.append('password', _this.u.newUserPassword);
  data.append('enable2fa', _this.u.newUser2FA ? 'true' : 'false');
  
  axios.request(axios_cfg('api/user/create', data, 'form'))
    .then(function(response) {
      _this.$notify({title: 'New user created', type: 'success'})
      _this.getUserData();
    })
}
```

#### 3. Agregar columna 2FA

Añadimos la columna en la tabla de usuarios:

```javascript
{
  label: '2FA',
  field: 'TwoFAEnabled',
  sortable: false,
  tdClass: 'text-center',
  globalSearchDisabled: true,
}
```

#### 4. Implementar toggle interactivo

Agregamos el template para el checkbox funcional:

```html
<template slot="table-row" slot-scope="props">
  <span v-if="props.column.field == 'TwoFAEnabled'">
    <input type="checkbox" 
           :checked="props.row.TwoFAEnabled" 
           @change="toggleUser2FA(props.row.Identity, $event.target.checked)"
           :title="props.row.TwoFAEnabled ? 'Click to disable 2FA' : 'Click to enable 2FA'">
  </span>
  <!-- ... otros campos ... -->
</template>
```

#### 5. Función toggleUser2FA()

Implementamos la función para cambiar el estado:

```javascript
toggleUser2FA: function(username, enable) {
  var data = new URLSearchParams();
  data.append('username', username);
  data.append('enable', enable ? 'true' : 'false');

  axios.request(axios_cfg('api/user/2fa/toggle', data, 'form'))
    .then(function(response) {
      var action = enable ? 'enabled' : 'disabled';
      _this.$notify({title: '2FA ' + action + ' for user ' + username, type: 'success'})
      _this.getUserData();
    })
    .catch(function(error) {
      _this.$notify({title: 'Failed to toggle 2FA for user ' + username, type: 'error'})
    })
}
```

## Pruebas

### Crear usuarios con diferentes configuraciones

```bash
# Crear usuario CON 2FA
curl -X POST -d "username=test2fa&password=pass123&enable2fa=true" http://localhost:8080/api/user/create
# Resultado: TwoFAEnabled: true

# Crear usuario SIN 2FA  
curl -X POST -d "username=testno2fa&password=pass123&enable2fa=false" http://localhost:8080/api/user/create
# Resultado: TwoFAEnabled: false
```

### Verificar estado en la lista

```bash
curl -s http://localhost:8080/api/users/list | jq '.[] | {Identity, TwoFAEnabled}'
# Salida esperada:
# {"Identity": "test2fa", "TwoFAEnabled": true}
# {"Identity": "testno2fa", "TwoFAEnabled": false}
```

### Probar toggle de 2FA

```bash
# Deshabilitar 2FA
curl -X POST -d "username=test2fa&enable=false" http://localhost:8080/api/user/2fa/toggle
# Verificar: TwoFAEnabled: false

# Habilitar 2FA
curl -X POST -d "username=test2fa&enable=true" http://localhost:8080/api/user/2fa/toggle
# Verificar: TwoFAEnabled: true
```

### Probar funcionalidad QR

```bash
# Usuario CON 2FA - debe funcionar
curl -s http://localhost:8080/api/qr-code/test2fa > qr.png
file qr.png
# Output: PNG image data, 200 x 200

# Usuario SIN 2FA - debe fallar
curl -s http://localhost:8080/api/qr-code/testno2fa
# Output: Google auth secret not found for user
```

## Resultado Final

La implementación proporciona:

- ✅ **Checkbox en creación**: Opción clara al crear usuarios
- ✅ **Toggle dinámico**: Click para activar/desactivar 2FA
- ✅ **Visualización inmediata**: Estado visible en la tabla
- ✅ **Control total**: Gestión completa desde GUI
- ✅ **Retroalimentación**: Notificaciones de éxito/error

Los administradores ahora pueden gestionar la 2FA de forma completa sin necesidad de acceso a la consola, con una interfaz intuitiva y responsiva.