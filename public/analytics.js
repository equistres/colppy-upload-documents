// Analytics Configuration - Mixpanel
(function(f,b){if(!b.__SV){var e,g,i,h;window.mixpanel=b;b._i=[];b.init=function(e,f,c){function g(a,d){var b=d.split(".");2==b.length&&(a=a[b[0]],d=b[1]);a[d]=function(){a.push([d].concat(Array.prototype.slice.call(arguments,0)))}}var a=b;"undefined"!==typeof c?a=b[c]=[]:c="mixpanel";a.people=a.people||[];a.toString=function(a){var d="mixpanel";"mixpanel"!==c&&(d+="."+c);a||(d+=" (stub)");return d};a.people.toString=function(){return a.toString(1)+".people (stub)"};i="disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(" ");
for(h=0;h<i.length;h++)g(a,i[h]);var j="set set_once union unset remove delete".split(" ");a.get_group=function(){function b(c){d[c]=function(){call2_args=arguments;call2=[c].concat(Array.prototype.slice.call(call2_args,0));a.push([e,call2])}}for(var d={},e=["get_group"].concat(Array.prototype.slice.call(arguments,0)),c=0;c<j.length;c++)b(j[c]);return d};b._i.push([e,f,c])};b.__SV=1.2;e=f.createElement("script");e.type="text/javascript";e.async=!0;e.src="undefined"!==typeof MIXPANEL_CUSTOM_LIB_URL?
MIXPANEL_CUSTOM_LIB_URL:"file:"===f.location.protocol&&"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\/\//)?"https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js":"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";g=f.getElementsByTagName("script")[0];g.parentNode.insertBefore(e,g)}})(document,window.mixpanel||[]);

mixpanel.init('70cdfac3c6917b21c98de14b024a9d2a', {
  debug: true,
  track_pageview: true,
  persistence: 'localStorage',
  flags: true
});

// Identificar usuario en Mixpanel e Intercom
window.identifyUser = function(userId, userProperties) {
    // Identificar en Mixpanel
    if (typeof mixpanel !== 'undefined') {
        try {
            mixpanel.identify(userId);
            if (userProperties) {
                mixpanel.people.set(userProperties);
            }
        } catch (e) {
            console.error('Mixpanel identify error:', e);
        }
    }

    // Identificar en Intercom
    if (window.Intercom) {
        try {
            // Intercom usa 'email' como identificador principal para encontrar usuarios existentes
            const intercomData = {
                email: userId, // El userId debe ser el email
                ...userProperties
            };
            window.Intercom('update', intercomData);
        } catch (e) {
            console.error('Intercom identify error:', e);
        }
    }
};

// Tracking helper - Envía a Mixpanel e Intercom
window.trackEvent = function(eventName, properties) {
    // Enviar a Mixpanel
    if (typeof mixpanel !== 'undefined') {
        try {
            mixpanel.track(eventName, properties);
        } catch (e) {
            console.error('Mixpanel error:', e);
        }
    }

    // Enviar a Intercom
    if (window.Intercom) {
        try {
            window.Intercom('trackEvent', eventName, properties);
        } catch (e) {
            console.error('Intercom error:', e);
        }
    }
};
