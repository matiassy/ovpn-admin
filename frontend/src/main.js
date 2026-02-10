import Vue from 'vue';
import axios from 'axios';
import VueCookies from 'vue-cookies'
import BootstrapVue from 'bootstrap-vue'
import VueClipboard from 'vue-clipboard2'
import Notifications from 'vue-notification'
import VueGoodTablePlugin from 'vue-good-table'

Vue.use(VueCookies)
Vue.use(VueClipboard)
Vue.use(BootstrapVue)
Vue.use(Notifications)
Vue.use(VueGoodTablePlugin)

console.log('Vue plugins loaded');

var axios_cfg = function(url, data='', type='form') {
  if (data == '') {
    return {
      method: 'get',
      url: url
    };
  } else if (type == 'form') {
    return {
      method: 'post',
      url: url,
      data: data,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    };
  } else if (type == 'file') {
    return {
      method: 'post',
      url: url,
      data: data,
      headers: { 'Content-Type': 'multipart/form-data' }
    };
   } else if (type == 'json') {
    return {
      method: 'post',
      url: url,
      data: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};

new Vue({
  el: '#app',
  data: {
    columns: [
      {
        label: 'Name',
        field: 'Identity',
        sortable: true,
      },
      {
        label: 'Account Status',
        field: 'AccountStatus',
        sortable: true,
      },
      {
        label: 'Active Connections',
        field: 'Connections',
        sortable: true,
      },
      {
        label: 'Expiration Date',
        field: 'ExpirationDate',
        sortable: true,
      },
      {
        label: 'Revocation Date',
        field: 'RevocationDate',
        sortable: true,
      },
      {
        label: '2FA',
        field: 'TwoFAEnabled',
        sortable: false,
        tdClass: 'text-center',
        globalSearchDisabled: true,
      },
      {
        label: 'Actions',
        field: 'actions',
        sortable: false,
        tdClass: 'text-right',
        globalSearchDisabled: true,
      },
    ],
    rows: [],
    tableKey: 0, // Para forzar re-renderizado
    searchQuery: '', // Para búsqueda
    sortField: 'Identity', // Campo de ordenamiento por defecto
    sortDirection: 'asc', // Dirección de ordenamiento por defecto
    actions: [
      {
        name: 'u-change-password',
        label: 'Change password',
        class: 'btn-warning',
        showWhenStatus: 'Active',
        showForServerRole: ['master'],
        showForModule: ['passwdAuth'],
      },
      {
        name: 'u-revoke',
        label: 'Revoke',
        class: 'btn-warning',
        showWhenStatus: 'Active',
        showForServerRole: ['master'],
        showForModule: ["core"],
      },
      {
        name: 'u-delete',
        label: 'Delete',
        class: 'btn-danger',
        showWhenStatus: 'Revoked',
        showForServerRole: ['master'],
        showForModule: ["core"],
      },
      {
        name: 'u-delete',
        label: 'Delete',
        class: 'btn-danger',
        showWhenStatus: 'Expired',
        showForServerRole: ['master'],
        showForModule: ["core"],
      },
      {
        name: 'u-rotate',
        label: 'Rotate',
        class: 'btn-warning',
        showWhenStatus: 'Revoked',
        showForServerRole: ['master'],
        showForModule: ["core"],
      },
      {
        name: 'u-rotate',
        label: 'Rotate',
        class: 'btn-warning',
        showWhenStatus: 'Expired',
        showForServerRole: ['master'],
        showForModule: ["core"],
      },
      {
        name: 'u-unrevoke',
        label: 'Unrevoke',
        class: 'btn-primary',
        showWhenStatus: 'Revoked',
        showForServerRole: ['master'],
        showForModule: ["core"],
      },
      // {
      //   name: 'u-show-config',
      //   label: 'Show config',
      //   class: 'btn-primary',
      //   showWhenStatus: 'Active',
      //   showForServerRole: ['master', 'slave'],
      //   showForModule: ["core"],
      // },
      {
        name: 'u-download-config',
        label: 'Download config',
        class: 'btn-info',
        showWhenStatus: 'Active',
        showForServerRole: ['master', 'slave'],
        showForModule: ["core"],
      },
      {
        name: 'u-download-qrcode',
        label: 'Download QR Code',
        class: 'btn-info',
        showWhenStatus: 'Active',
        showForServerRole: ['master', 'slave'],
        showForModule: ["google-auth-2fa"],
      },
      {
        name: 'u-enable-2fa',
        label: 'Enable 2FA',
        class: 'btn-success',
        showWhenStatus: 'Active',
        showForServerRole: ['master'],
        showForModule: ["google-auth-2fa"],
      },
      {
        name: 'u-disable-2fa',
        label: 'Disable 2FA',
        class: 'btn-secondary',
        showWhenStatus: 'Active',
        showForServerRole: ['master'],
        showForModule: ["google-auth-2fa"],
      },
      {
        name: 'u-edit-ccd',
        label: 'Edit routes',
        class: 'btn-primary',
        showWhenStatus: 'Active',
        showForServerRole: ['master'],
        showForModule: ["ccd"],
      },
      {
        name: 'u-edit-ccd',
        label: 'Show routes',
        class: 'btn-primary',
        showWhenStatus: 'Active',
        showForServerRole: ['slave'],
        showForModule: ["ccd"],
      }
    ],
    filters: {
      hideRevoked: true,
    },
    serverRole: "master",
    lastSync: "unknown",
    modulesEnabled: [],
    u: {
      newUserName: '',
      newUserPassword: '',
      newUser2FA: false,
      newUserCreateError: '',
      newPassword: '',
      passwordChangeStatus: '',
      passwordChangeMessage: '',
      rotateUserMessage: '',
      deleteUserMessage: '',
      modalNewUserVisible: false,
      modalShowConfigVisible: false,
      modalShowCcdVisible: false,
      modalChangePasswordVisible: false,
      modalRotateUserVisible: false,
      modalDeleteUserVisible: false,
      openvpnConfig: '',
      ccd: {
        Name: '',
        ClientAddress: '',
        CustomRoutes: []
      },
      newRoute: {},
      ccdApplyStatus: "",
      ccdApplyStatusMessage: "",
    },

    toggleUser2FA: function(username, enable) {
      var _this = this;

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
  },
  watch: {
  },
  mounted: function () {
    console.log('Vue app mounted');
    this.getUserData();
    this.getServerSetting();
    this.filters.hideRevoked = this.$cookies.isKey('hideRevoked') ? (this.$cookies.get('hideRevoked') == "true") : false
    console.log('Initial hideRevoked filter:', this.filters.hideRevoked);
    
    // Watch for changes in filteredRows
    this.$watch('filteredRows', function(newVal) {
      console.log('filteredRows changed:', newVal.length, 'items');
    });
  },
  created() {
    var _this = this;

    _this.$root.$on('u-revoke', function (msg) {
      var data = new URLSearchParams();
      data.append('username', _this.username);
      axios.request(axios_cfg('api/user/revoke', data, 'form'))
      .then(function(response) {
        _this.getUserData();
        _this.$notify({title: 'User ' + _this.username + ' revoked!', type: 'warn'})
      });
    })
    _this.$root.$on('u-unrevoke', function () {
      var data = new URLSearchParams();
      data.append('username', _this.username);
      axios.request(axios_cfg('api/user/unrevoke', data, 'form'))
      .then(function(response) {
        _this.getUserData();
        _this.$notify({title: 'User ' + _this.username + ' unrevoked!', type: 'success'})
      });
    })
    _this.$root.$on('u-rotate', function () {
      _this.u.modalRotateUserVisible = true;
      var data = new URLSearchParams();
      data.append('username', _this.username);
    })
    _this.$root.$on('u-delete', function () {
      _this.u.modalDeleteUserVisible = true;
      var data = new URLSearchParams();
      data.append('username', _this.username);
    })
    _this.$root.$on('u-show-config', function () {
      _this.u.modalShowConfigVisible = true;
      var data = new URLSearchParams();
      data.append('username', _this.username);
      axios.request(axios_cfg('api/user/config/show', data, 'form'))
      .then(function(response) {
        _this.u.openvpnConfig = response.data;
      });
    })
    _this.$root.$on('u-download-config', function () {
      var data = new URLSearchParams();
      data.append('username', _this.username);
      axios.request(axios_cfg('api/user/config/show', data, 'form'))
      .then(function(response) {
        const blob = new Blob([response.data], { type: 'text/plain' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = _this.username + ".ovpn"
        link.click()
        URL.revokeObjectURL(link.href)
      }).catch(console.error);
    })   
    _this.$root.$on('u-download-qrcode', function () {
      const url = `/api/qr-code/${_this.username}`;
    
      axios.get(url, { responseType: 'blob' })
        .then(function (response) {
          const blob = new Blob([response.data], { type: 'image/png' });
    
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = _this.username + ".png"; 
          link.click();
    
          URL.revokeObjectURL(link.href);
        })
        .catch(console.error);
    });
    _this.$root.$on('u-edit-ccd', function () {
      _this.u.modalShowCcdVisible = true;
      var data = new URLSearchParams();
      data.append('username', _this.username);
      axios.request(axios_cfg('api/user/ccd', data, 'form'))
      .then(function(response) {
        _this.u.ccd = response.data;
      });
    })
    _this.$root.$on('u-disconnect-user', function () {
      _this.u.modalShowCcdVisible = true;
      var data = new URLSearchParams();
      data.append('username', _this.username);
      axios.request(axios_cfg('api/user/disconnect', data, 'form'))
      .then(function(response) {
        console.log(response.data);
      });
    })
    _this.$root.$on('u-change-password', function () {
      _this.u.modalChangePasswordVisible = true;
      var data = new URLSearchParams();
      data.append('username', _this.username);
    })
  },
  computed: {
    customAddressDynamic: function () {
      return this.u.ccd.ClientAddress == "dynamic"
    },
    ccdApplyStatusCssClass: function () {
        return this.u.ccdApplyStatus == 200 ? "alert-success" : "alert-danger"
    },
    passwordChangeStatusCssClass: function () {
      return this.u.passwordChangeStatus == 200 ? "alert-success" : "alert-danger"
    },
    userRotateStatusCssClass: function () {
      return this.u.roatateUserStatus == 200 ? "alert-success" : "alert-danger"
    },
    deleteUserStatusCssClass: function () {
      return this.u.deleteUserStatus == 200 ? "alert-success" : "alert-danger"
    },
    modalNewUserDisplay: function () {
      return this.u.modalNewUserVisible ? {display: 'flex'} : {}
    },
    modalShowConfigDisplay: function () {
      return this.u.modalShowConfigVisible ? {display: 'flex'} : {}
    },
    modalShowCcdDisplay: function () {
      return this.u.modalShowCcdVisible ? {display: 'flex'} : {}
    },
    modalChangePasswordDisplay: function () {
      return this.u.modalChangePasswordVisible ? {display: 'flex'} : {}
    },
    modalRotateUserDisplay: function () {
      return this.u.modalRotateUserVisible ? {display: 'flex'} : {}
    },
    modalDeleteUserDisplay: function () {
      return this.u.modalDeleteUserVisible ? {display: 'flex'} : {}
    },
    revokeFilterText: function() {
      return this.filters.hideRevoked ? "Show revoked" : "Hide revoked"
    },
    filteredRows: function() {
      var filtered = this.filters.hideRevoked ? 
        this.rows.filter(function(account) {
          return account.AccountStatus == "Active"
        }) : 
        this.rows;
      console.log('=== FILTER DEBUG ===');
      console.log('Total rows:', this.rows.length);
      console.log('hideRevoked filter:', this.filters.hideRevoked);
      console.log('Filtered rows:', filtered.length);
      console.log('==================');
      return filtered;
    },
    filteredAndSearchedRows: function() {
      var filtered = this.filteredRows;
      if (!this.searchQuery) {
        return this.sortRows(filtered);
      }
      var query = this.searchQuery.toLowerCase();
      var searched = filtered.filter(function(user) {
        return user.Identity.toLowerCase().includes(query) ||
               user.AccountStatus.toLowerCase().includes(query) ||
               (user.TwoFAEnabled && '2fa'.includes(query)) ||
               (!user.TwoFAEnabled && 'no 2fa'.includes(query));
      });
      return this.sortRows(searched);
    },
    sortedAndSearchedRows: function() {
      return this.filteredAndSearchedRows;
    },

  },
  methods: {
    sortBy: function(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDirection = 'asc';
      }
    },
    sortRows: function(rows) {
      var _this = this;
      return rows.slice().sort(function(a, b) {
        var aValue = a[_this.sortField];
        var bValue = b[_this.sortField];
        
        // Handle different data types
        if (_this.sortField === 'Connections') {
          aValue = parseInt(aValue) || 0;
          bValue = parseInt(bValue) || 0;
        } else if (_this.sortField === 'ExpirationDate' || _this.sortField === 'RevocationDate') {
          aValue = aValue || '';
          bValue = bValue || '';
        } else {
          aValue = String(aValue || '').toLowerCase();
          bValue = String(bValue || '').toLowerCase();
        }
        
        if (aValue < bValue) {
          return _this.sortDirection === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return _this.sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
    },
    getStatusClass: function(status) {
      switch(status) {
        case 'Active': return 'status-active';
        case 'Revoked': return 'status-revoked';
        case 'Expired': return 'status-expired';
        default: return '';
      }
    },
    formatDate: function(dateString) {
      if (!dateString) return '';
      try {
        var date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      } catch(e) {
        return dateString;
      }
    },
    rowStyleClassFn: function(row) {
      if (row.ConnectionStatus == 'Connected') {
        return 'connected-user'
      }
      if (row.AccountStatus == 'Revoked') {
        return 'revoked-user'
      }
      if (row.AccountStatus == 'Expired') {
        return 'expired-user'
      }
      return ''
    },
    getVisibleActions: function(row) {
      return this.actions.filter(action => 
        action.showWhenStatus === row.AccountStatus &&
        action.showForServerRole.includes(this.serverRole) &&
        action.showForModule.some(module => this.modulesEnabled.includes(module))
      );
    },
    rowActionFn: function(e) {
      this.username = e.target.dataset.username;
      this.$root.$emit(e.target.dataset.name);
    },
    getUserData: function() {
      var _this = this;
      console.log('Fetching user data...');
      axios.request(axios_cfg('api/users/list'))
        .then(function(response) {
          console.log('User data received:', response.data);
          _this.rows = Array.isArray(response.data) ? response.data : [];
          console.log('Rows set to:', _this.rows);
          console.log('Rows length:', _this.rows.length);
          
          // Forzar re-renderizado completo incrementando la key
          _this.tableKey += 1;
          console.log('Table key incremented to:', _this.tableKey);
          
          _this.$nextTick(function() {
            console.log('NextTick triggered');
            _this.$forceUpdate();
          });
        })
        .catch(function(error) {
          console.error('Error fetching user data:', error);
          _this.rows = [];
        });
    },

    getServerSetting: function() {
      var _this = this;
      axios.request(axios_cfg('api/server/settings'))
      .then(function(response) {
        _this.serverRole = response.data.serverRole;
        _this.modulesEnabled = response.data.modules;

        if (_this.serverRole == "slave") {
          axios.request(axios_cfg('api/sync/last/successful'))
          .then(function(response) {
            _this.lastSync =  response.data;
          });
        }
      });
    },

    createUser: function() {
      var _this = this;
      console.log('createUser called with:', {
        username: _this.u.newUserName,
        password: _this.u.newUserPassword,
        enable2fa: _this.u.newUser2FA
      });

      _this.u.newUserCreateError = "";

      if (!_this.u.newUserName || !_this.u.newUserPassword) {
        console.error('Username or password missing');
        _this.u.newUserCreateError = "Username and password are required";
        return;
      }

      var data = new URLSearchParams();
      data.append('username', _this.u.newUserName);
      data.append('password', _this.u.newUserPassword);
      data.append('enable2fa', _this.u.newUser2FA ? 'true' : 'false');

      _this.username = _this.u.newUserName;

      console.log('Sending request to create user...');
      axios.request(axios_cfg('api/user/create', data, 'form'))
      .then(function(response) {
        console.log('User created successfully:', response.data);
        _this.$notify({title: 'New user ' + _this.username + ' created', type: 'success'})
        _this.u.modalNewUserVisible = false;
        _this.u.newUserName = '';
        _this.u.newUserPassword = '';
        _this.u.newUser2FA = false;
        
        // Forzar recarga de datos
        _this.tableKey += 1;
        _this.getUserData();
      })
      .catch(function(error) {
        console.error('Error creating user:', error);
        _this.u.newUserCreateError = error.response.data;
        _this.$notify({title: 'New user ' + _this.username + ' creation failed.', type: 'error'})
      });
    },

    ccdApply: function() {
      var _this = this;

      _this.u.ccdApplyStatus = "";
      _this.u.ccdApplyStatusMessage = "";

      axios.request(axios_cfg('api/user/ccd/apply', JSON.stringify(_this.u.ccd), 'json'))
      .then(function(response) {
        _this.u.ccdApplyStatus = 200;
        _this.u.ccdApplyStatusMessage = response.data;
        _this.$notify({title: 'Ccd for user ' + _this.username + ' applied', type: 'success'})
      })
      .catch(function(error) {
        _this.u.ccdApplyStatus = error.response.status;
        _this.u.ccdApplyStatusMessage = error.response.data;
        _this.$notify({title: 'Ccd for user ' + _this.username + ' apply failed ', type: 'error'})
      });
    },

    changeUserPassword: function(user) {
      var _this = this;

      _this.u.passwordChangeMessage = "";

      var data = new URLSearchParams();
      data.append('username', user);
      data.append('password', _this.u.newPassword);

      axios.request(axios_cfg('api/user/change-password', data, 'form'))
        .then(function(response) {
          _this.u.passwordChangeStatus = 200;
          _this.u.newPassword = '';
          _this.getUserData();
          _this.u.modalChangePasswordVisible = false;
          _this.$notify({title: 'Password for user ' + _this.username + ' changed!', type: 'success'})
        })
        .catch(function(error) {
          _this.u.passwordChangeStatus = error.response.status;
          _this.u.passwordChangeMessage = error.response.data.message;
          _this.$notify({title: 'Changing password for user ' + _this.username + ' failed!', type: 'error'})
        });
    },

    rotateUser: function(user) {
      var _this = this;

      _this.u.rotateUserMessage = "";

      var data = new URLSearchParams();
      data.append('username', user);
      data.append('password', _this.u.newPassword);

      axios.request(axios_cfg('api/user/rotate', data, 'form'))
        .then(function(response) {
          _this.u.roatateUserStatus = 200;
          _this.u.newPassword = '';
          _this.getUserData();
          _this.u.modalRotateUserVisible = false;
          _this.$notify({title: 'Certificates for user ' + _this.username + ' rotated!', type: 'success'})
        })
        .catch(function(error) {
          _this.u.roatateUserStatus = error.response.status;
          _this.u.rotateUserMessage = error.response.data.message;
          _this.$notify({title: 'Rotate certificates for user ' + _this.username + ' failed!', type: 'error'})
        })
    },
    deleteUser: function(user) {
      var _this = this;

      _this.u.deleteUserMessage = "";

      var data = new URLSearchParams();
      data.append('username', user);

      axios.request(axios_cfg('api/user/delete', data, 'form'))
        .then(function(response) {
          _this.u.deleteUserStatus = 200;
          _this.u.newPassword = '';
          _this.getUserData();
          _this.u.modalDeleteUserVisible = false;
          _this.$notify({title: 'User ' + _this.username + ' deleted!', type: 'success'})
        })
        .catch(function(error) {
          _this.u.deleteUserStatus = error.response.status;
          _this.u.deleteUserMessage = error.response.data.message;
          _this.$notify({title: 'Deleting user ' + _this.username + ' failed!', type: 'error'})
        })
    },
  }

})
