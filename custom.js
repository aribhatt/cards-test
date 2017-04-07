/* Custom JS code for DMA App */
/* Sending logs to //console. Turn it to false for production  */
var DMAAppDebug = true;


var DMAAppbuildVersion = "1.4.12";

var lastRefreshTime = "";
var contextData = {
    "buildVersion": DMAAppbuildVersion
};

/* Initiating permissions variable */
var permissions = "";

/* Variable to store data from JSON File */
var jsonData;

var analyticsPageNamePrefix = "dmaapp:";

var screenWidth = window.screen.width * window.devicePixelRatio / 2;
var deviceOffline = false;
var isValidToken = false;

/* Local Storage Variable */
var DMAAppLocalStorage = window.localStorage;

/* URLs */
var baseURLProd = "https://or1010050204078.corp.adobe.com";
/* Developement options */
var baseURLDev = "https://or1010050204112.corp.adobe.com";
var DMADev = "DMADevEnv"


/* initiating storage */
if (typeof(dmaAppStorage) === 'undefined') {
    dmaAppStorage = new DMAAppStorage();
}

/* Check for dev environment and set base URL */
if (dmaAppStorage.getKey(DMADev) == "true") {
    var baseURL = baseURLDev;
} else {
    var baseURL = baseURLProd;
}

/* Creating URLs */
var authURL = baseURL + "/mca/auth/";
var tokenURLFormat = "/auth/success/#usertoken=";
var failureURLFormat = "/auth/failed/";
var logoutURLFormat = "/auth/logoutsuccess/";
var validateTokenURL = baseURL + "/mca/api/v1/user/";
var setDeviceIDURL = baseURL + "/mca/api/v1/user/";
var logOutURLBase = baseURL + "/mca/auth/logout/";

/* Reports Page */
var reportsPage = "index.html";
var loginPage = "login.html";

/* keys for local storage */
var tokenName = "IMSIToken";
var deviceID = "deviceID";

/* Authenticated Token & Device ID */
var authToken = "";
var pushDeviceID = "";

/* Messages */
var failedLoginMsg = "Login failed. This user do not have access to DMA App !!";


/* Send to console based on debug flag */
function DMAAppSendToConsole(msg) {
    if (DMAAppDebug) {
        console.log("DMAApp:" + msg);
    }
}


/* Authentication function - called when login is clicked */
function DMAAppAuth() {
    var ref = cordova.InAppBrowser.open(authURL, '_blank', 'toolbar=no,location=no');
    ref.addEventListener('loadstart', function(event) {
        if (event.url.indexOf(tokenURLFormat) !== -1) {
            var token = event.url.split(tokenURLFormat)[1];

            /* Store Token */
            dmaAppStorage.setKey(tokenName, token);
            authToken = dmaAppStorage.getKey(tokenName);
            DMAAppSendToConsole("Token is " + authToken);

            /* check if tempDeviceID has value */
            var tempID = dmaAppStorage.getKey("tempdeviceID");
            if (tempID !== "") {
                var send = sendDeviceID();
            }

            DMAAppSendToConsole("Login Success");
            window.location = reportsPage;
        }
        if (event.url.indexOf(failureURLFormat) !== -1) {
            DMAAppSendToConsole("Failed Adobe ID Login - User do not have access to the app");
            if (window.location.href.indexOf("login.html") === -1) {
                window.location = loginPage + "?msg=" + failedLoginMsg;
            }
        }
    });
}

/* DMAApp Storage */
function DMAAppStorage() {
    this.storage = window.localStorage;

    this.getKey = function(key) {
        return this.storage.getItem(key);
    }
    this.setKey = function(key, value) {
        return this.storage.setItem(key, value);
    }
    this.removeKey = function(key) {
        return this.storage.removeItem(key);
    }
}

/* Send Device ID for push messages */
function sendDeviceID() {
    authToken = dmaAppStorage.getKey(tokenName);
    pushDeviceID = dmaAppStorage.getKey(deviceID);
    DMAAppSendToConsole("Inside sendDeviceID authToken is " + authToken + " & pushDeviceID is " + pushDeviceID);
    if (authToken === "" || authToken === null) {
        DMAAppSendToConsole("Couldn't send Device id as authToken is empty " + authToken);
        return false;
    }
    $.ajax({
        'url': setDeviceIDURL + authToken + "/setDeviceDetails",
        'type': 'POST',
        'data': "device_id=" + pushDeviceID,
        success: function(result) {
            DMAAppSendToConsole("URL is " + setDeviceIDURL + authToken + " result is " + JSON.stringify(result));
            DMAAppSendToConsole("Device ID Registered");
            return false;
        }
    });
}

/* Check Device ID */
function checkDeviceID(value) {
    if (pushDeviceID !== value)
        return false;
    else return true;
}


/* Check authentication for a given token */
function checkAuthentication() {

    $.mobile.loading("show", {
        text: "Loading..",
        textVisible: true,
        theme: "b",
        html: ""
    });

    authToken = dmaAppStorage.getKey(tokenName);
    DMAAppSendToConsole("Checking for an existing authentication key: " + authToken);
    if (authToken === "" || authToken === null) {
        DMAAppSendToConsole("Returning false");
        $.mobile.loading("hide");
        return false;
    }
    $.ajax({
        'url': validateTokenURL + authToken + "/validateToken",
        'type': 'GET',
        'data': "",
        success: function(result) {
            DMAAppSendToConsole(result);
            if (result.success == true) {
                DMAAppSendToConsole("Existing Token, returning true");
                isValidToken = true;
                DMAAppSendToConsole("Sending user to reports page since a valid token is found");
                $.mobile.loading("hide");
                window.location = reportsPage;
            } else {
                DMAAppSendToConsole("Returning false since result was not true");
                isValidToken = false;
                $.mobile.loading("hide");
            }
        },
        error: function(result) {
            DMAAppSendToConsole("Returning false since there was ajax error");
            isValidToken = false;
            $.mobile.loading("hide");
        }

    });
}


// Function to get Query Parameters
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// Close App Function - May not be used currently
function exitFromApp() {
    //alert("closing app");
    if (navigator.app) {
        navigator.app.exitApp();
    } else if (navigator.device) {
        navigator.device.exitApp();
    } else {
        window.close();
    }
    ADB.trackState(analyticsPageNamePrefix + 'exitbuttonclick', contextData);
}


/* Logout Action */
function logoutFromApp() {
    authToken = dmaAppStorage.getKey(tokenName);
    logOutURL = logOutURLBase + authToken;
    DMAAppSendToConsole("Logout URL is " + logOutURL);

    var ref = cordova.InAppBrowser.open(logOutURL, '_blank', 'toolbar=no,location=no');
    ref.addEventListener('loadstart', function(event) {
        if (event.url.indexOf(logoutURLFormat) !== -1) {
            DMAAppSendToConsole("Logged out Success");
            ADB.trackState(analyticsPageNamePrefix + 'logout-success', contextData);
            window.location = loginPage;
        }
    });
}


/* Device ready event listener */
document.addEventListener("deviceready", onDeviceReady, false);


/* Device ready function */
function onDeviceReady() {
    DMAAppSendToConsole("Device Ready");

    /* Handle Login page */
    if (window.location.href.indexOf("login.html") !== -1) {
        DMAAppSendToConsole("On authentication page");
        ADB.trackState(analyticsPageNamePrefix + 'login', contextData);
        checkAuthentication();

        var msg = getParameterByName("msg", window.location.href);
        if (typeof(msg) !== "undefined" && msg !== null) {
            loginFailureAlert(msg);
        }
    }

    /* Handle Login page */
    if (window.location.href.indexOf("index.html") !== -1) {
        DMAAppSendToConsole("On DMA Home page");
        ADB.trackState(analyticsPageNamePrefix + 'home', contextData);
    }


    /* handle device rotation */
    window.addEventListener(
        "orientationchange",
        function() {
            // Announce the new orientation number
            ADB.trackState(analyticsPageNamePrefix + 'rotate-screen', contextData);
            location.reload();
        }, false);


    /* Defining permissions variable */
    permissions = cordova.plugins.permissions;
    if (device.platform.toLowerCase().indexOf('android') !== -1) {
        permissions.hasPermission(permissions.WRITE_EXTERNAL_STORAGE, checkPermissionCallback, null);
    }
}


// Email screenshot
function emailScreenshot() {
    /* Check Permissions */
    dmaAppPermissions();

    //Take Screenshot
    navigator.screenshot.save(function(error, res) {
        if (error) {
            //console.error(error);
        } else {
            DMAAppSendToConsole('ScreenShot Captured: ', res.filePath);
            DMAAppSendToConsole('file: ' + res.filePath);


            // Launch Sharing options
            // this is the complete list of currently supported params you can pass to the plugin (all optional)
            var options = {
                message: '', // not supported on some apps (Facebook, Instagram)
                subject: 'Adobe Now Screenshot', // fi. for email
                files: ['file://' + res.filePath], // an array of filenames either locally or remotely
                chooserTitle: 'Pick an app to share' // Android only, you can override the default share sheet title
            }

            var onSuccess = function(result) {
                DMAAppSendToConsole("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
                DMAAppSendToConsole("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
                ADB.trackState(analyticsPageNamePrefix + 'emailscreenshot:complete', contextData);
            }

            var onError = function(msg) {
                DMAAppSendToConsole("Sharing failed with message: " + msg);
                ADB.trackState(analyticsPageNamePrefix + 'emailscreenshot:error', contextData);
            }

            window.plugins.socialsharing.shareWithOptions(options, onSuccess, onError);

        }
    });
}

// Add notofication for offline (no internet)
document.addEventListener("offline", onOffline, false);

function onOffline() {
    if (!deviceOffline) {
        deviceOffline = true;
        var ZebraAlertOptions = {
            width: screenWidth / 2,
            'type': 'warning',
            'title': "Device Offline",
            'overlay_opacity': 1
        };
        var DMAAppAlert = "This app needs active internet connection to function properly";
        $.Zebra_Dialog(DMAAppAlert, ZebraAlertOptions);
    }
}

/* Login failed message */
function loginFailureAlert(msg) {
    var ZebraAlertOptions = {
        width: screenWidth / 2,
        'type': 'warning',
        'title': "Login Failed"
    };
    $.Zebra_Dialog(msg, ZebraAlertOptions);
    ADB.trackState(analyticsPageNamePrefix + 'login:fail', contextData);
}


/* Check Android Permissions */
function dmaAppPermissions() {
    try {
        DMAAppSendToConsole("Checking permissions..");
        permissions = cordova.plugins.permissions;
        if (device.platform.toLowerCase().indexOf('android') !== -1) {
            permissions.hasPermission(permissions.WRITE_EXTERNAL_STORAGE, checkPermissionCallback, null);
        }
    } catch (e) {}
}

function checkPermissionCallback(status) {
    //permissions = cordova.plugins.permissions;
    if (!status.hasPermission) {
        var errorCallback = function() {
            DMAAppSendToConsole("Permission not available");
        }

        permissions.requestPermission(
            permissions.WRITE_EXTERNAL_STORAGE,
            function(status) {
                if (!status.hasPermission) errorCallback();
            },
            errorCallback);
    }
}

authToken = dmaAppStorage.getKey(tokenName);

function ajax_request() {
    var auth = validateTokenURL + authToken; // Commeinting for local instance
    //   console.log(auth, 'auth');
    $.ajax({
        url: auth,
        //'https://or1010050204078.corp.adobe.com/mca/api/v1/user/mala',

        async: true,
        success: function(result) {
            //console.log(result);
            countCards(result);
            home_card(result);
        },
        error: function() {
            // code to handle error
        },
        complete: function() {
            expand_collapse();
            /*setTimeout(function(){
            		console.log('delay');ajax_request();		
            }, 3000);*/
        }
    })
}
if (window.location.href.toLowerCase().indexOf('login') == -1) {
    ajax_request();
}
//closing of ajax
var cards = [];
var counter = 0;
var bulletHomeheight = 20;
var colorCodes = [];
colorCodes['actual'] = "#eaab1c",
    colorCodes['target'] = "#00bb00",
    colorCodes['projected'] = "#e6e6e6";

function countCards(result) {
    var card_freq = [0, 0, 0, 0, 0];
    var arr = $.map(result, function(el) { return el; });
    $.each(arr, function(index, value) {
        if (typeof value.name !== 'undefined') {
            var template = value.template;
            var count = 0;
            var freq;
            if (template.toLowerCase().indexOf("summary") != -1) {
                lastRefreshTime = value.last_refreshed;
                count = 0;
            } else if (template.toLowerCase().indexOf("region") != -1) {
                count = 1;
            } else if (template.toLowerCase().indexOf("channel") != -1) {
                count = 2;
            } else if (template.toLowerCase().indexOf("target") != -1) {
                count = 3;
            } else if (template.toLowerCase().indexOf("campaign") != -1) {
                count = 4;
            }

            cards.push({ 'card_name': value.name, 'card_index': count, 'card_freq': card_freq[count] });
            card_freq[count]++;
        }
    });

    //console.log(cards);
    $("#DMAHome .leftNavigation").attr('id', "navigPanelAnalytics"); //$("#DMAHome .hamberger").attr('href', "#leftNav");

    populateNavMenu("#DMAHome #navigPanelAnalytics", 'Home', -1, -1, true);
    createAboutPage();
}

function createAboutPage() {
    var abt = document.getElementById('about-template');
    $('body').append(abt.innerHTML);
    $('#dma_ver').html('Version : ' + DMAAppbuildVersion);
    $('#dma_refresh').html('Last refreshed at : ' + lastRefreshTime);

    populateNavMenu("#About  #navigPanelAbout", 'About', -1, -1, false);
    $('.c_setting.p_20').click(function() {
        $.mobile.changePage("#About", { transition: "slideup", changeHash: true });
    });
}

function parseRegionDetailData(json, card_no) {
    var data1 = [],
        data2 = [];

    //console.log(json);
    $.each(json[card_no], function(index, data) {
        //console.log(index, data[0]);

        $.each(data, function(i, d) {


            if (typeof d === 'object') {

                console.log(i, d);
                var count = 0;

                $.each(d, function(j, k) {

                    if (count == 1) {

                        console.log(j, k);
                        var type = 0;

                        $.each(k, function(x, m) {
                            //console.log(type, x, m);


                            var day = 0;

                            $.each(m, function(y, n) {
                                console.log(type, day, y, n);

                                var c = 0;

                                for (var z in n) {
                                    var item = {};
                                    //console.log(type, day, c, z, n[z]);
                                    if (type == 0) {

                                        if (day == 0) {
                                            var item = {};
                                            item['name'] = z;
                                            //item['data'] = n[z];
                                            item['yes-data'] = n[z];
                                            data1.push(item);
                                        } else if (day === 1) {
                                            //console.log(data1[c]);
                                            data1[c]['today-data'] = n[z];
                                            data1[c]['data'] = n[z];
                                        }
                                    } else if (type == 1) {
                                        if (day == 0) {

                                            data1[c]['yes-target'] = n[z];
                                        } else if (day === 1) {
                                            data1[c]['target'] = n[z];
                                            data1[c]['today-target'] = n[z];
                                        }
                                    } else if (type == 2) {
                                        if (day == 0) {

                                            data1[c]['yes-proj'] = n[z];
                                        } else if (day === 1) {
                                            data1[c]['projected'] = n[z];
                                            data1[c]['today-proj'] = n[z];
                                        }
                                    }

                                    c++;
                                }

                                day++;

                            });
                            type++;

                        });

                    }
                    count++;


                });

                //console.log(data1);



            }


        });


    });



    return data1;
    //console.log(data2);

    //   renderRegionDetailData(data1, data2, Ddate, name, count, card_index, card_freq, p1_name, p2_name)

}

function parseRegionCards(json, Ddate, name, count, card_index, card_freq) {
    var data1 = [],
        data2 = [];
    var c = 0;
    $.each(json, function(index, value) {
        var data = [];

        var template = value.template;
        var pname = value.name;

        if (template && template.toLowerCase().indexOf('region') > -1) {

            data = parseRegionDetailData(value.detail_trends, card_freq);

            data1.push(data);
            data2.push(pname);

            c++;
        }
    });
    //console.log(data1);
    //console.log(data2);
    renderRegionDetailData(data1, Ddate, name, count, card_index, card_freq, data2)
}

function parseChannelCards(json, Ddate, name, count, card_index, card_freq) {
    var data1 = [],
        data2 = [];
    var c = 0;
    $.each(json, function(index, value) {
        var data = [];

        var template = value.template;


        if (template && template.toLowerCase().indexOf('channel') > -1) {
            var page = value.name;
            console.log('Calling parse...', index, card_freq);

            data = parseRegionDetailData(value.detail_trends, card_freq);


            data1.push(data);
            data2.push(page);

            c++;
        }
    });
    //console.log(data1);
    //console.log(data2);
    renderRegionDetailData(data1, Ddate, name, count, card_index, card_freq, data2);
    $('#analytics' + count + '' + card_freq + ' .graph_txt').css('background-position', '70px');
}

function home_card(result) {
    var arr = $.map(result, function(el) { return el; })

    var count = 0;
    var card0 = 0,
        card1 = 0,
        card2 = 0;

    var card_freq = [0, 0, 0, 0, 0];
    var card_count = 0;
    $.each(arr, function(index, value) {
        var template = value.template;

        /*$("div[data-role=page].Analytics:not(:first)").each(function(index, element) {
            $(this).remove();
        });*/
        if (!template && typeof value == "object") {
            // user profile
            var profile_template = $('#hidden-userIcon').html();
            $("body div[data-role=page]:eq(0)").append(profile_template);
            // console.log(value,index,'index');
            $("div[data-role=page]:eq(0) .pic_box img").attr('src', value.display_image);
            $("div[data-role=page]:eq(0) .submenu1 .name").text(value.display_name);
            $("div[data-role=page]:eq(0) .submenu1 .desg").text(value.display_title);

        } else if (template) {

            new_index = index - 1;
            if (template.toLowerCase().indexOf("summary") != -1) {

                var summary_template = $('#hidden-template').html();
                $("body div[data-role=page]:eq(0)").append(summary_template);

                $(".summary .headCont:eq(" + card_freq[0] + ") h2").html(value.name);
                summary_card(value);
                clicked_card(card_count, 0, card_freq[0]);

                detail_screen(value.detail_trends, value.date_today, value.name, 0, card_count, card_freq[0]);

                card_freq[0]++;
                card_count++;

            } else if (template.toLowerCase().indexOf("region") != -1) {

                var summary_template = $('#hidden-templateTraffic').html();
                $("body div[data-role=page]:eq(0)").append(summary_template);
                $(".region .headCont:eq(" + card_freq[1] + ") h2").html(value.name);
                region_card(value);
                clicked_card(card_count, 1, card_freq[1]);
                parseRegionCards(arr, value.date_today, value.name, 1, card_count, card_freq[1]);

                card_freq[1]++;
                card_count++;

            } else if (template.indexOf("channel") != -1) {

                var summary_template = $('#hidden-templateChannel').html();
                $("body div[data-role=page]:eq(0)").append(summary_template);
                $(".channel .headCont:eq(" + card_freq[2] + ") h2").html(value.name);
                $('.pieBig:eq(' + card_freq[2] + ') .donut-chart:eq(0)').attr('id', 'donut' + card_freq[2]);
                $('.channel:eq(' + card_freq[2] + ') .card-footer:eq(0)').attr('id', 'cardFoot' + card_freq[2]);
                processDataForDonut('#donut' + card_freq[2], '#cardFoot' + card_freq[2], value);
                processHomeChannelBulletData(value, card_freq[2]);

                clicked_card(card_count, 2, card_freq[2]);
                //console.log(value.name, card_count);
                parseChannelCards(arr, value.date_today, value.name, 2, card_count, card_freq[2]);

                card2++;
                card_freq[2]++;
                card_count++;

            } else if (template.indexOf("target") != -1) {
                card_freq[3]++;
                //card_count++;

            } else if (template.indexOf("campaign") != -1) {
                card_freq[4]++;
                //card_count++;

            } else {

            }
        }
    });

    // console.log(card_freq[0]);

}

function process_date(date_range) {
    var date1 = date_range.split('-');
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    // console.log(date1[1],'month');
    var start_date = monthNames[date1[1] - 1] + ' ' + date1[2] + ', ' + date1[0];
    return start_date;
}

function summary_card(value) {
    var states = [],
        labels = [];
    $.each(value.collection, function(index, value) {
        //console.log(value.name,index ,'num');
        // $("[data-role=page] .text:eq("+index+")").text(value.name);
        if (value.name.toLowerCase().indexOf('trend') == -1) {
            //if(index!=2){

            var arr_data = $.map(value, function(el) { return el; })
                //console.log(arr_data,'arr_data');
            for (var ele in arr_data) {

                var new_ele = arr_data[ele];
                if (typeof new_ele == 'object') { // first nested object
                    var counter1 = 0;
                    for (var lift in new_ele) {

                        var visits = new_ele[lift];

                        if (typeof visits == 'object') { // second nested object

                            var arr_data1 = $.map(visits, function(el) { return el; })
                                //console.log(arr_data1,'array_Data',counter1);
                            states[counter1] = arr_data1[0];
                            counter1++;

                            //	console.log(states);

                        } else {
                            //labels
                            labels[index] = new_ele[lift]

                        }

                    }

                }


            }
            //						console.log(counter,'counter');
            //var cnt=$('[data-role=page] .c1-fig1').length;
            $('[data-role=page] .c1-fig1:eq(' + counter + ')').attr("id", 'today_bullet' + counter);
            //$('[data-role=page] .c1-fig2:last').attr("id",'today_bullet2'+index);
            if (typeof states[2] == 'undefined') states[2] = 0;
            if (typeof states[1] == 'undefined') states[1] = 0;
            if (typeof states[0] == 'undefined') states[0] = 0;
            //console.log(states,'states',counter);// all values and labels 
            $("[data-role=page] .c1:eq(" + counter + ") span:last").html(kFormatter(states[0]));
            $("[data-role=page] .t1:eq(" + counter + ") span:last").html(kFormatter(states[1]));
            $("[data-role=page] .p1:eq(" + counter + ") span:last").html(kFormatter(states[2]));
            // pass actual, target and projected values 
            var trafficStackData = [{ "title": labels[0], "ranges": [states[2]], "measures": [states[0]], "markers": [states[1]] }];
            renderHomeBullet("#today_bullet" + counter, trafficStackData, colorCodes, bulletHomeheight);
            counter++;



        } // index less than 2
        else {
            trend_graph(value);


        }
    })

    //console.log(cards);
}

function trend_graph(value) {

    // for trend graph in home screen

    var arr_data2 = $.map(value, function(el) { return el; })
    for (var ele2 in arr_data2) {
        var new_ele2 = arr_data2[ele2];
        if (typeof new_ele2 == 'object') { // first nested object
            //console.log(new_ele2,'new_ele2');
            var graph_Data = [],
                graph_Data1 = [];
            counter = 0;
            for (var ele3 in new_ele2) {
                //	console.log(ele3,'ele3');

                if (ele3.toLowerCase().indexOf('proj') == -1 && ele3.toLowerCase().indexOf('tar') == -1) {
                    var data_objes = new_ele2[ele3];
                    if (typeof data_objes == 'object') {
                        for (var data_obj in data_objes) {
                            graph_Data[counter] = data_objes[data_obj];
                            counter++;

                        }

                    }
                } else if (ele3.toLowerCase().indexOf('target') != -1) {
                    var counter = 0;
                    var data_objes = new_ele2[ele3];
                    if (typeof data_objes == 'object') {
                        for (var data_obj in data_objes) {
                            //									console.log(data_objes[data_obj],'data_obj',data_obj,counter,'counter');					
                            graph_Data1.push({ "weekTitle": data_obj, "traffic": graph_Data[counter], "target": data_objes[data_obj] });
                            var index_graph = $("[data-role=page] .area-chart").length;
                            $(".area-chart:last").attr('id', 'area-chart' + index_graph);
                            // newData.push( {"weekTitle":weekTitle ,"traffic":barTraffic[param1_name][key],"target":barTraffic['Target'][key]} )
                            barChart('#area-chart' + index_graph, graph_Data1);
                            counter++;

                        }

                    }



                }

            }

        }


    }


    counter = 0;

}

function barChart(renderDiv, data) {
    //  if(!$(renderDiv).is(':empty')){
    $(renderDiv).empty();
    var margin = {
            top: 40,
            right: 0,
            bottom: 0,
            left: 0
        },
        width = $(renderDiv).width() - 7 - margin.left - margin.right,
        height = 80 - margin.top - margin.bottom;

    //var formatPercent = d3.format(".0%");
    var formatValue = d3.format(".2s"); //Million Formating
    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("top")
        .tickSize(0);

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(5, "d")
        .tickSize(0)
        .tickFormat("");

    /*
	  var tip = d3.tip()
		.attr('class', 'd3-tip')
		.offset([-10, 0])
		.html(function(d) {
		  return "<strong>Average normalized input:</strong> <span style='color:red'>" + d.traffic * 100 + "</span>";
		})
   */
    var chart1 = d3.select(renderDiv).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr('font-size', '.85em')
        .attr('font-weight', 'bold');


    x.domain(data.map(function(d) {
        return d.weekTitle;
    }));
    //x2.domain(data.map(function(d){return d.target}));
    y.domain([0, d3.max(data, function(d) {
        return d.traffic
    })]);

    chart1.append("g")
        .attr("class", "x axis")
        .style("fill", "#a4a4a4")
        .style("text-transform", "uppercase")
        .style("font-size", ".8em")
        .style("z-index", "999")

    //.attr("transform", "translate(0," + height-10 + ")")
    .call(xAxis);

    chart1.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    var eSel = chart1.selectAll(".bar2")
        .data(data)
        .enter();

    eSel.append("rect")
        .attr("class", "bar2")
        .style("fill", "#f68b19")
        .attr("x", function(d) {
            return x(d.weekTitle);
        })
        .attr("width", x.rangeBand())
        .attr("y", function(d) {
            return y(d.traffic);
        })
        .attr("height", function(d) {
            return height - y(d.traffic);
        });

    /*
    bar_enter.append("text")
    .text(function(d) { return d3.format(".2s")(d.y1-d.y0)+"%"; })
    .attr("y", function(d) { return y(d.y1)+(y(d.y0) - y(d.y1))/2; })
    .attr("x", x.rangeBand()/3)
    .style("fill", '#ffffff');
    */
    var cnt = -78;
    var lblCnt = 127;
    eSel.append("text")
        .text(function(d) { return formatValue(d.traffic); })
        .attr("y", function(d, i) { return height - 6; })
        //.attr("y", function(d,i) { return y(d.traffic)*2; })
        //.attr("x", function(d,i) { console.log( x.rangeBand(i)/3 ); return x(d.traffic)*2; })
        .attr("x", function(d, i) { return x(d.weekTitle) + x.rangeBand() / 3 - 7; })
        //.attr("x", function(d,i) { cnt = cnt+lblCnt; return cnt; })
        //.attr("x", x.rangeBand()/3)
        .style("fill", '#50504c')
        //.style("position","absolute")
        // .style("z-index","999");


    eSel.append("path")
        .style("stroke", "#007f2d")
        .style("stroke-width", 2)
        .attr("d", function(d) {
            var rv = "M" + x(d.weekTitle) + "," + y(d.target);
            rv += "L" + (x(d.weekTitle) + x.rangeBand()) + "," + y(d.target);
            return rv;
        });

    //});

}

function region_card(value) {
    $.each(value.collection, function(index, value) {
        //	console.log(value,index)

        var arr_data = $.map(value, function(el) { return el; })

        for (var ele in arr_data) {
            var new_ele = arr_data[ele];
            if (typeof new_ele == 'object') {
                for (var lift in new_ele) {
                    var visits = new_ele[lift];
                    if (typeof visits == 'object') {

                        for (var visit in visits) {
                            //	console.log(visits[visit],'visit',visit); // states
                            var states = visits[visit];
                            if (typeof states == 'object') {
                                counter = 0;
                                //console.log(states,'states');
                                for (var state in states) {
                                    //	console.log('value',states[state],'state',state,$('.region:last .row.c2-r1:first').text(),'region'); 
                                    // state and its value
                                    //$('.region:last .row.c2-r2:last').text(state)
                                    //console.log(counter);

                                    if (counter < 6) {
                                        //console.log(states[state], lift);
                                        $('.region:last .row.c2-r2:eq(' + counter + ')').html(state);
                                        //	$('.region:last .row.c2-r1 .t1:eq('+counter+')').html(states[state]);
                                        if (lift.toLowerCase().indexOf('lift') != -1) {
                                            check_arrowStatus('.region:last .row.c2-r1 .a1:eq(' + counter + ')', states[state]);
                                        } else {
                                            //check_arrowStatus('.region:last .row.c2-r1 .v1:eq('+counter+')',states[state]);
                                            $('.region:last .row.c2-r1 .v1:eq(' + counter + ')').html(kFormatter(states[state]));
                                        }
                                    }
                                    counter++;

                                }
                                //expand_collapse(".region:last .expand_up",".region:last .first_row",".region:last .second_row");
                                // $('.region:last ')
                                counter = 0;

                            }

                        }

                    }

                }
            }

        }

    })

}
//arrow logic for up or down symbol
function check_arrowStatus(ele, val) {
    // console.log($(ele).length,'ele',val);
    if (val == "0") {
        if ($(ele).hasClass('up_arrow')) { $(ele).removeClass('up_arrow').addClass('down_arrow'); } else if (!$(ele).hasClass('down_arrow')) { $(ele).addClass('down_arrow'); }
    } else if (val == "1") {
        if ($(ele).hasClass('down_arrow')) { $(ele).removeClass('down_arrow').addClass('up_arrow'); } else if (!$(ele).hasClass('up_arrow')) { $(ele).addClass('up_arrow'); }
    }

}

function populateNavMenu(selector, name, template_type, card_index, isHome) {
    var item = '<hr><a href="#' + (isHome ? '' : 'DMAHome') + '" data-transition="slide" class="olwhite">Home</a>';
    $(selector).append(item);
    $.each(cards, function(i, a) {
        var id = card_index;
        if (isHome) {
            // console.log(a['card_name'] + '......' + a['card_index'] + '......' + a['card_freq']);
            id = 'h';
        }

        id = id + '' + a['card_index'] + '' + a['card_freq'] + '' + i;



        item = '<hr><a id="navlink' + id + '" href="#analytics' + a['card_index'] + '' + a['card_freq'] + '" class="olwhite" data-target="#sliderg' + a['card_index'] + '' + a['card_freq'] + '" data-transition="slide" data-slide-to="' + a['card_freq'] + '">' + a['card_name'] + '</a>';



        $(selector).append(item);
        if (a['card_name'] != name) {
            $('#navlink' + id).click(function() {
                //   console.log('clickedddddd');
                $('#sliderg' + a['card_index'] + '' + a['card_freq']).carousel(a['card_freq']);
                $.mobile.changePage("#analytics" + a['card_index'] + '' + a['card_freq'], { transition: "slideup", changeHash: true });
            });
        }

    });


}

function detail_screen(detail, Ddate, name, count, card_index, card_freq) {
    //   console.log('creating detail screen1 ' + count);
    var screen = 0;
    var detail_template = $('#detail-template2').html();
    //console.log(detail_template);
    $("body").append(detail_template);
    $(".Analytics:eq(" + card_index + ")").attr('id', "analytics" + count + '' + card_freq);
    var date_value = process_date(Ddate);
    var analytics_id = "#analytics" + count + '' + card_freq;
    var slider_id = "#sliderg" + count + '' + card_freq;
    $(analytics_id + " .date-display-card").html(date_value);
    $(analytics_id + " .carousel").attr('id', "sliderg" + count + '' + card_freq);
    $(analytics_id + " .carousel").attr('data-url', analytics_id);

    $(slider_id).swiperight(function() {
        $(slider_id).carousel('prev');
    });
    $(slider_id).swipeleft(function() {
        $(slider_id).carousel('next');
    });

    $(analytics_id + " .leftNavigation").prop('id', "leftNav" + count + '' + card_freq);
    $(analytics_id + " .hamberger").attr('href', "#leftNav" + count + '' + card_freq);
    populateNavMenu(analytics_id + "  #leftNav" + count + '' + card_freq, name, count, card_index, false);

    $.each(detail, function(index, value) {
        //console.log(value.name,'detail1');
        //          console.log(index,'index',value,'value');
        if (index < 3) {
            var analytics_pg = "#analytics_page" + count + '' + card_freq + '' + index;

            var ind_class = '';
            if (index == card_freq) {
                ind_class = ' class="active"';
            }
            $(slider_id + " .carousel-indicators").append('<li data-target="' + slider_id + '" data-slide-to="' + index + '"' + ind_class + '></li>');
            var summary_template = $('#slider-screen').html();
            $(slider_id + "  .carousel-inner:eq(0)").append(summary_template);

            //console.log(index,$(".Analytics:eq("+index+") h3").length);
            $(analytics_id + " .Analytics_Page:eq(" + index + ")").attr('id', "analytics_page" + count + '' + card_freq + '' + index);
            $(analytics_pg + " h3").html(value.name);
            if (index == card_freq) {
                $(analytics_pg).addClass('active');
            }
            var id = "detailGraph" + count + '' + card_freq + "" + index;
            var chk = document.getElementById(id);
            if (!chk) {
                var div = document.createElement('div');
                div.id = id;
                $(analytics_pg + " .detail-screen-graph:eq(0)").html(div);
                $("#" + id).css({ "width": "100%", "text-shadow": "none", "font-size": "1em" });
            }

            $.each(value, function(i, d) {

                // console.log(i, d);
                if (i == 0) {
                    //   console.log('index less than 3 means yesterday and today data', d);
                    var sum_a = [];
                    var sum_t = [];
                    var sum_p = [];
                    if (typeof d == 'object') {
                        for (var dataEle in d) {
                            // console.log(value[dataEle],dataEle);
                            var dataEle1 = d[dataEle];
                            if (typeof dataEle1 == 'object') {
                                for (var dataEle2 in dataEle1) {

                                    var dataEle3 = dataEle1[dataEle2];
                                    //	 console.log(dataEle3,dataEle2);
                                    if (typeof dataEle3 == 'object') {
                                        for (var data4 in dataEle3) {
                                            //	 console.log(dataEle3[data4],data4);// visits, target and project
                                            var data5 = dataEle3[data4];
                                            var inc = 0;
                                            if (typeof data5 == 'object') {
                                                for (var data6 in data5) {
                                                    // console.log(data5[data6],data6,data4);
                                                    // sum_a[inc]=data5[data6];
                                                    // inc++
                                                    if (data4.toLowerCase().indexOf('target') != -1) {
                                                        sum_t[inc] = Number(data5[data6]);
                                                    } else if (data4.toLowerCase().indexOf('projec') != -1) {
                                                        sum_p[inc] = Number(data5[data6]);
                                                    } else {
                                                        sum_a[inc] = Number(data5[data6]);
                                                    }
                                                    inc++;
                                                }
                                                //console.log( sum_a,'sum_a');
                                            }

                                        }
                                    }


                                }

                            } // if condition

                        }

                    }
                    var newINDEX = index;

                    //console.log('str2', count, card_index, card_freq);

                    for (var m = 0; m < sum_a.length; m++) {
                        if (!sum_p[m - 1]) sum_p[m - 1] = 0;
                        var ele_id = "dataGraph_" + m + "_" + card_freq + "_" + index + Math.floor((Math.random() * 100) + 1);
                        //   console.log($("#analytics" + "" + count + card_index + " #analytics_page" + count + '' + card_freq + '' + newINDEX + "  .detail-fig:eq(" + m + ")").index(), 'page');
                        $("#analytics" + "" + count + card_index + " #analytics_page" + count + '' + card_freq + '' + newINDEX + "  .detail-fig:eq(" + m + ")").attr('id', ele_id)
                        var trafficStackData1 = [{ "title": data4 + count + m, "ranges": [sum_p[m - 1]], "measures": [sum_a[m]], "markers": [sum_t[m]] }];
                        //console.log(trafficStackData1, 'trafficStackData1');
                        renderHomeBullet("#" + ele_id, trafficStackData1, colorCodes, bulletHomeheight);

                        $("#analytics" + "" + count + card_index + " #analytics_page" + count + '' + card_freq + '' + newINDEX + "  .txt-orange:eq(" + m + ")").html(kFormatter(sum_a[m]));
                        $("#analytics" + "" + count + card_index + " #analytics_page" + count + '' + card_freq + '' + newINDEX + "  .txt-green:eq(" + m + ")").html(kFormatter(sum_t[m]));
                        $("#analytics" + "" + count + card_index + " #analytics_page" + count + '' + card_freq + '' + newINDEX + "  .txt-white:eq(0)").html(kFormatter(sum_p[0]))

                    }
                    //var trafficStackData = [{ "title": labels[0], "ranges": [states[2]], "measures": [states[0]], "markers": [states[1]] }];



                } else {
                    processDataForLineChart(id, d);
                }

            });

            if (count == 0) {

                //
            } else if (count == 1) {}
        } else {


            //console.log('index greater than 3 means yesterday and today data',value);
            var sum_a = [];
            var sum_t = [];
            var sum_p = [];
            if (typeof value == 'object') {
                for (var dataEle in value) {
                    // console.log(value[dataEle],dataEle);
                    var dataEle1 = value[dataEle];
                    if (typeof dataEle1 == 'object') {
                        for (var dataEle2 in dataEle1) {

                            var dataEle3 = dataEle1[dataEle2];
                            //	 console.log(dataEle3,dataEle2);
                            if (typeof dataEle3 == 'object') {
                                for (var data4 in dataEle3) {
                                    //	 console.log(dataEle3[data4],data4);// visits, target and project
                                    var data5 = dataEle3[data4];
                                    var inc = 0;
                                    if (typeof data5 == 'object') {
                                        for (var data6 in data5) {
                                            // console.log(data5[data6],data6,data4);
                                            // sum_a[inc]=data5[data6];
                                            // inc++
                                            if (data4.toLowerCase().indexOf('target') != -1) {
                                                sum_t[inc] = Number(data5[data6]);
                                            } else if (data4.toLowerCase().indexOf('projec') != -1) {
                                                sum_p[inc] = Number(data5[data6]);
                                            } else {
                                                sum_a[inc] = Number(data5[data6]);
                                            }
                                            inc++;
                                        }
                                        //console.log( sum_a,'sum_a');
                                    }

                                }
                            }


                        }

                    } // if condition

                }

            }
            var newINDEX = index - 3;

            //    console.log('str2', count, card_index,card_freq);
            /*
            for (var m = 0; m < sum_a.length; m++) {
                if (!sum_p[m - 1]) sum_p[m - 1] = 0;
                var ele_id = "dataGraph_" + m + "_" + card_freq + "_" + index + Math.floor((Math.random() * 100) + 1);
                console.log($("#analytics" + "" + count + card_index + " #analytics_page" + count + '' + card_freq + '' + newINDEX + "  .detail-fig:eq(" + m + ")").index(), 'page');
                $("#analytics" + "" + count + card_index + " #analytics_page" + count + '' + card_freq + '' + newINDEX + "  .detail-fig:eq(" + m + ")").attr('id', ele_id)
                var trafficStackData1 = [{ "title": data4 + count + m, "ranges": [sum_p[m - 1]], "measures": [sum_a[m]], "markers": [sum_t[m]] }];
                renderHomeBullet("#" + ele_id, trafficStackData1, colorCodes, bulletHomeheight);

                $("#analytics" + "" + count + card_index + " #analytics_page" + count + '' + card_freq + '' + newINDEX + "  .txt-orange:eq(" + m + ")").html(kFormatter(sum_a[m]));
                $("#analytics" + "" + count + card_index + " #analytics_page" + count + '' + card_freq + '' + newINDEX + "  .txt-green:eq(" + m + ")").html(kFormatter(sum_t[m]));
                $("#analytics" + "" + count + card_index + " #analytics_page" + count + '' + card_freq + '' + newINDEX + "  .txt-white:eq(0)").html(kFormatter(sum_p[0]))

            }*/
            //var trafficStackData = [{ "title": labels[0], "ranges": [states[2]], "measures": [states[0]], "markers": [states[1]] }];


        }
    });

}






function renderRegionDetailData(data, Ddate, name, count, card_index, card_freq, p_names) {
    //   console.log('creating detail screen1 ' + count);
    var screen = 0;
    var detail_template = $('#detail-template2').html();
    //console.log(detail_template);
    $("body").append(detail_template);
    $(".Analytics:eq(" + card_index + ")").attr('id', "analytics" + count + '' + card_freq);
    var date_value = process_date(Ddate);
    var analytics_id = "#analytics" + count + '' + card_freq;
    var slider_id = "#sliderg" + count + '' + card_freq;
    $(analytics_id + " .date-display-card").html(date_value);
    $(analytics_id + " .carousel").attr('id', "sliderg" + count + '' + card_freq);
    $(analytics_id + " .carousel").attr('data-url', analytics_id);

    $(slider_id).swiperight(function() {
        $(slider_id).carousel('prev');
    });
    $(slider_id).swipeleft(function() {
        $(slider_id).carousel('next');
    });

    $(analytics_id + " .leftNavigation").prop('id', "leftNav" + count + '' + card_freq);
    $(analytics_id + " .hamberger").attr('href', "#leftNav" + count + '' + card_freq);
    populateNavMenu(analytics_id + "  #leftNav" + count + '' + card_freq, name, count, card_index, false);

    for (var index = 0; index < data.length; index++) {
        var analytics_pg = "#analytics_page" + count + '' + card_freq + '' + index;

        var ind_class = '';
        if (index == card_freq) {
            ind_class = ' class="active"';
        }
        $(slider_id + " .carousel-indicators").append('<li data-target="' + slider_id + '" data-slide-to="' + index + '"' + ind_class + '></li>');
        var summary_template = $('#slider-screen2').html();
        $(slider_id + "  .carousel-inner:eq(0)").append(summary_template);

        //console.log(index,$(".Analytics:eq("+index+") h3").length);
        $(analytics_id + " .Analytics_Page:eq(" + index + ")").attr('id', "analytics_page" + count + '' + card_freq + '' + index);
        //$(analytics_pg + " h3").html(value.name);
        if (index == card_freq) {
            $(analytics_pg).addClass('active');
        }

        var id = "detailGraph" + count + '' + card_freq + "" + index;
        var chk = document.getElementById(id);
        if (!chk) {
            var div = document.createElement('div');
            div.id = id;
            $(analytics_pg + " .detail-screen-graph:eq(0)").html(div);
            $("#" + id).css({ "width": "100%", "text-shadow": "none", "font-size": "1em" });
        }


        //if (index == 0) {
        //console.log(index, data[index]);
        $(analytics_pg + ' h3.text-center:eq(0)').text(p_names[index]);
        populateRegionAnalyticsPage('#' + id, data[index], index, card_index);

        //} else {
        //$(analytics_pg + ' h3.text-center:eq(0)').text(p2_name);
        //populateRegionAnalyticsPage('#' + id, traffic, index, card_index);

        //}

    }
}


function populateRegionAnalyticsPage(selector, data, card_index, page_index, page_name = '') {
    //console.log(data);

    $.each(data, function(i, d) {

        var temp = $('#region-detail-item').html();
        $(selector).append(temp);
        $(selector + ' .region-analytics-card:eq(' + i + ')').attr('id', 'c' + card_index + '' + page_index + '' + i);
        //console.log('creating panel...', $(selector).length);
        $('#c' + card_index + '' + page_index + '' + i + ' .region-double-card:eq(0)').attr('id', 'c' + card_index + '' + page_index + '' + i + 'd');
        $('#c' + card_index + '' + page_index + '' + i + ' .region-single-card:eq(0)').attr('id', 'c' + card_index + '' + page_index + '' + i + 's');

        $('#c' + card_index + '' + page_index + '' + i + 's' + ' .graph_txt:eq(0)').attr('id', 'txt' + card_index + '' + page_index + '' + i + 's');
        $('#c' + card_index + '' + page_index + '' + i + 's' + ' .region_bullet:eq(0)').attr('id', 'bullet' + card_index + '' + page_index + '' + i + 's');

        $('#c' + card_index + '' + page_index + '' + i + 'd' + ' .graph_txt:eq(0)').attr('id', 'txt' + card_index + '' + page_index + '' + i + 'd1');
        $('#c' + card_index + '' + page_index + '' + i + 'd' + ' .detail-fig:eq(0)').attr('id', 'bullet' + card_index + '' + page_index + '' + i + 'd1');
        $('#c' + card_index + '' + page_index + '' + i + 'd' + ' .graph_txt:eq(1)').attr('id', 'txt' + card_index + '' + page_index + '' + i + 'd2');
        $('#c' + card_index + '' + page_index + '' + i + 'd' + ' .detail-fig:eq(1)').attr('id', 'bullet' + card_index + '' + page_index + '' + i + 'd2');

        $('#c' + card_index + '' + page_index + '' + i + 'd' + ' .blue-txt-round-bg:eq(0)').text(d['name']);

        if (i == 0) {
            $('#c' + card_index + '' + page_index + '' + i + 'd').removeClass('hide');
            $('#c' + card_index + '' + page_index + '' + i + 'd').addClass('show');
            $('#c' + card_index + '' + page_index + '' + i + 's').removeClass('show');
            $('#c' + card_index + '' + page_index + '' + i + 's').addClass('hide');
        }

        bulletRegioncard(d, 'bullet' + card_index + '' + page_index + '' + i + 's', 'txt' + card_index + '' + page_index + '' + i + 's', false, false);

        bulletRegioncard(d, 'bullet' + card_index + '' + page_index + '' + i + 'd1', 'txt' + card_index + '' + page_index + '' + i + 'd1', true, true);

        bulletRegioncard(d, 'bullet' + card_index + '' + page_index + '' + i + 'd2', 'txt' + card_index + '' + page_index + '' + i + 'd2', true, false);
        toggleDivs('#c' + card_index + '' + page_index + '' + i + 'd', '#c' + card_index + '' + page_index + '' + i + 's', selector);

    });

}

function toggleDivs(divD, divS, page) {

    $(divS).height($(divD).height());

    $(divD).on('click', function() {
        //console.log('clickedd.....');
        hideDetailDiv(page);
        $(divD).removeClass('show');
        $(divD).addClass('hide');
        $(divS).addClass('show');
        $(divS).removeClass('hide');
    });
    $(divS).on('click', function() {
        hideDetailDiv(page);
        $(divS).removeClass('show');
        $(divS).addClass('hide');
        $(divD).addClass('show');
        $(divD).removeClass('hide');
    });
}

function hideDetailDiv(page) {
    //console.log('hiding...');
    $(page + ' .region-double-card').removeClass('show');
    $(page + ' .region-double-card').addClass('hide');
    $(page + ' .region-single-card').removeClass('hide');
    $(page + ' .region-single-card').addClass('show');
}

function bulletRegioncard(data, id, text_id, isDetail, isYes = false) {
    //console.log('This is card : ' + counter);
    var states = [];

    var bulletRegionHeight = (isDetail) ? 15 : 20;
    var bulletRegionWidth = ($('body').width() - 40) * .65;
    var colorCodes = [];
    var legends;

    if (isDetail) {
        bulletRegionWidth *= 0.65;
        bulletRegionHeight *= 0.6;
    }

    colorCodes['actual'] = "darkorange", colorCodes['target'] = "#00bb00",
        colorCodes['projected'] = "#e6e6e6";

    //console.log(states, id); // all values and labels 
    //$("[data-role=page] .c3-h1:eq(" + counter + ")").html(kFormatter(states[0]));
    //console.log(str1);
    var str1 = '';

    if (isDetail) {

        if (!isYes) {
            states[0] = data['today-data'];
            states[1] = data['today-proj'];
            states[2] = data['today-target'];
        } else {
            states[0] = data['yes-data'];
            states[1] = data['yes-proj'];
            states[2] = data['yes-target'];
        }
        str1 = '<p></p><span class="legend-text legend-actual" >' + kFormatter(states[0]) + '</span>';
        if (typeof states[1] != 'undefined')
            str1 += '<span class="legend-text legend-target" >' + kFormatter(states[1]) + '</span>';
        if (typeof states[2] != 'undefined')
            str1 += '<span class="legend-text legend-prj" >' + kFormatter(states[2]) + '</span></p>';
        $('#' + text_id).html(str1);

    } else {
        states[0] = data['data'];
        states[1] = data['projected'];
        states[2] = data['target'];
        $('#' + text_id).html(data['name']);
    }
    //console.log('cols', colorCodes);
    //console.log(states);
    //console.log($('[data-role=page] .c3-fig' + i + ':eq(' + counter + ')').attr('id'));
    //$('[data-role=page] .c1-fig2:last').attr("id",'today_bullet2'+index);
    if (typeof states[2] == 'undefined') states[2] = 0;
    if (typeof states[1] == 'undefined') states[1] = 0;
    if (typeof states[0] == 'undefined') states[0] = 0;
    //$("[data-role=page] .p1:eq(" + counter + ") span:last").html(kFormatter(states[2]));
    var trafficStackData = [{ "title": data['name'], "ranges": [states[2]], "measures": [states[0]], "markers": [states[1]] }];


    //console.log('width is :', bulletRegionHeight);
    renderHomeBullet('#' + id, trafficStackData, colorCodes, bulletRegionHeight, '', Math.floor(bulletRegionWidth));


}

function swipe_event() {
    $(document).on('swipeleft', '[data-role="page"]', function(event) {
        if (event.handled !== true) // This will prevent event triggering more then once
        {
            var nextpage = $.mobile.activePage.next('[data-role="page"]');
            // swipe using id of next page if exists
            //console.log(nextpage.length,'nextpage');
            if (nextpage.length > 0) {
                //console.log('slide page');
                $.mobile.changePage(nextpage, { transition: "slide", reverse: false }, true, true);
            }
            event.handled = true;
        }
        return false;

    })
    $(document).on('swiperight', '[data-role="page"]', function(event) {
        if (event.handled !== true) // This will prevent event triggering more then once
        {
            var prevpage = $(this).prev('[data-role="page"]');
            if (prevpage.length > 0) {
                $.mobile.changePage(prevpage, { transition: "slide", reverse: true }, true, true);
            }
            event.handled = true;
        }
        return false;
    });
}
//swipe_event();

function clicked_card(new_index, detail_index, carousel_index) {
    //    console.log(new_index, 'new_index');
    $("div[data-role=page]:eq(0) .card.container-fluid:eq(" + new_index + ")").on('click', function(e) {
        // console.log('clicked', new_index);
        // console.log(e,'e.target');
        if (e.target.className == 'expand_up') return;
        $.mobile.changePage("#analytics" + detail_index + '' + carousel_index, { transition: "slideup", changeHash: true });
        $('#sliderg' + detail_index + '' + carousel_index).carousel(carousel_index);
    })
}

function kFormatter(num) {

    if (num > 999999) { return num > 99999 ? (num / 1000000).toFixed(1) + 'M' : num } else {

        return num > 999 ? (num / 1000).toFixed(1) + 'k' : num;

    }
}
// hide and shown logic - Pass element ID or class that needs click event , column that needs to hide and expand 
function expand_collapse() {
    $("[data-role='page'] .region").each(function(index, element) {
        $(this).find(".expand_up").click(function(e) {
            //	console.log('test');
            if ($(this).siblings('.first_row').hasClass('show')) {
                //console.log('has show');
                $(this).siblings('.first_row').removeClass('show').addClass('hide');
                $(this).siblings('.second_row').removeClass('hide').addClass('show');
            } else {
                $(this).siblings('.first_row').removeClass('hide').addClass('show');
                $(this).siblings('.second_row').removeClass('show').addClass('hide');
            }
        })
    });


}


function renderHomeBullet(divId, data, colorCodes, graphHeight = 40, labelID = "", bullet_width = 0) {
    //console.log(bullet_width);
    $(divId).html("");
    var margin = { top: 0, right: 3, bottom: 0, left: 0 },
        width = ((bullet_width === 0) ? $(divId).width() : bullet_width),
        height = graphHeight - margin.top - margin.bottom,
        actualColor = colorCodes['actual'],
        targetColor = colorCodes['target'],
        projectedColor = colorCodes['projected'];
    width = width - margin.left - margin.right;
    //    console.log(width,'width');
    var chart = d3.bullet()
        .width(width)
        .height(height)
        .actualColor(actualColor)
        .targetColor(targetColor)
        .projectedColor(projectedColor);

    var svg = d3.select(divId).selectAll("svg")
        .data(data)
        .enter().append("svg")
        //.attr("class", "bullet")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .html(function(d) {
            if (d.title == "Channel") {

                var formatLabelStd = d3.format(".2s");
                $(labelID['label']).html(d.label);
                $(labelID['actual']).html(formatLabelStd(d.measures));
                $(labelID['projected']).html(formatLabelStd(d.ranges));

            }


        })
        .call(chart)
}

function processDataForLineChart(selectorId, json) {
    //console.log(json);
    //$("#"+selectorId).empty();
    var data = json.collection;
    var xaxis = data.axis_label.x_axis;
    var yaxis = data.axis_label.y_axis;

    //console.log(data);
    jsonArray = [];
    targetArray = [];
    var max1 = 0,
        max2 = 0;
    var count = 0;

    //console.log(xaxis + "................." + yaxis);


    for (var k in data.data[yaxis]) {

        item = {};
        item[xaxis] = count; //parseInt(k);

        item[yaxis] = parseInt(data.data[yaxis][k]);
        if (item[yaxis] > max1) {
            max1 = item[yaxis];
        }
        //if (!isNaN(parseInt(data.data.Visits[k]))) {
        //console.log(item["yaxis"] + "................." + item["xaxis"] * 2);
        jsonArray.push(item);
        count++;
        //}
    }

    count = 0;

    for (var k in data.data['Target']) {
        item = {};
        item[xaxis] = count; //parseInt(k);

        item['Target'] = parseInt(data.data['Target'][k]);
        if (item['Target'] > max2) {
            max2 = item['Target'];
        }
        //if (!isNaN(parseInt(data.data.Visits[k]))) {
        //        console.log(item['Target'] + "................." + item['Target']);
        targetArray.push(item);
        count++;
        //}
    }

    var max = (max1 > max2) ? max1 : max2;




    renderLineGraph(selectorId, jsonArray, targetArray, xaxis, yaxis, max);

    //xlabel.push(xaxis);
    //ylabel.push(yaxis);
    //selectorId = "#" + selectorId;

    //dailyTrafficAnalytics(selectorId, array, yaxis);
}
/*
window.addEventListener('resize', function() {
    $.each(divId, function(i, d) {
        renderLineGraph(d, jsonArray, xlabel[i], ylabel[i]);
    });
});
*/






function renderLineGraph(selectorId, data, target, labelX, labelY, maxY) {
    // set the dimensions and margins of the graph
    $("#" + selectorId).html("");

    //console.log(data);
    //console.log(target);
    var margin = { top: $(window).height() * .05, right: $(window).width() * .05, bottom: $(window).height() * .05, left: $(window).width() * .09 },
        width = ($("body").width() * 0.9) - margin.left - margin.right,
        height = $(window).height() * 0.6 - margin.top - margin.bottom;


    // set the ranges
    var x = d3.time.scale().range([0, width]);
    var y = d3.scale.linear().range([height, 0]);

    //console.log(x + '.........' + y);

    // define the line
    var valueline = d3.svg.line()
        .x(function(d) {
            return x(d[labelX]);
        })
        .y(function(d) {
            return y(d[labelY]);
        });

    var targetline = d3.svg.line()
        .x(function(d) {
            return x(d[labelX]);
        })
        .y(function(d) {
            return y(d['Target']);
        });

    /*

    var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);*/

    // append the svg obgect to the body of the page
    // appends a 'group' element to 'svg'
    // moves the 'group' element to the top left margin
    var svg = d3.select("#" + selectorId).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Get the data
    //dataArray.forEach(function(data) {
    //if (error) throw error;

    // format the data
    data.forEach(function(d) {
        d[labelX] = d[labelX];
        d[labelY] = +d[labelY];
        //console.log(d[labelX] + '.............' + d[labelY]);
    });

    // format the data

    target.forEach(function(d) {
        d[labelX] = d[labelX];
        d['Target'] = +d['Target'];
        //console.log(d[labelX] + '.............' + d[labelY]);
    });

    // scale the range of the data
    x.domain(d3.extent(data, function(d) {
        return d[labelX];
    }));
    y.domain([0, maxY / .8]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .tickSize(-height)
        .ticks(14)
        .tickPadding(15)
        .orient("bottom")
        .tickFormat(d3.format("s"));

    var yAxis = d3.svg.axis()
        .scale(y)
        .tickPadding(15)
        .tickSize(-width)
        .ticks(8)
        .orient("left")
    if (labelY.toLowerCase().indexOf("conversion") > -1) {
        yAxis.tickFormat(function(d) {
            return d.toFixed(1) + "%";
        });
    } else {
        yAxis.tickFormat(d3.format("s"));

    }



    // add the X Axis
    svg.append("g")
        .attr("class", "x axis gridLine")
        .attr("transform", "translate(0," + height + ")")
        .attr("id", "x--line")
        .call(xAxis)
        .append("text")
        .attr('id', 'labelY')
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dx", 100)
        .attr("dy", width + 10)
        .style("text-anchor", "end")
        .text(labelY);

    // add the Y Axis
    svg.append("g")
        .attr("class", "y axis grid")
        .attr("id", "y--line")

    .call(yAxis)
        .append("text")
        .attr('id', 'labelY')
        .attr("transform", "rotate(0)")
        .attr("y", 6)
        .attr("dx", 40)
        .attr("dy", -10)
        .style("text-anchor", "end")
        .text("Hours");



    // add the valueline path.

    svg.append("path")
        .data([target])
        .attr("class", "targetline")
        .attr("d", targetline);

    // add the valueline path.
    svg.append("path")
        .data([data])
        .attr("class", "line")
        .attr("d", valueline);

    // add the dots with tooltips
    svg.selectAll("dot")
        .data(data)
        .enter().append("circle")
        .attr("r", 3)
        .attr("cx", function(d) {
            return x(d[labelX]);
        })
        .attr("cy", function(d) {
            return isNaN(y(d[labelY])) ? 0 : y(d[labelY]);
        })
        .attr("fill", "none")
        .attr("stroke-width", function(d) {
            return (isNaN(y(d[labelY])) || y(d[labelY]) == 0) ? "0px" : "2px";
        })
        .attr("stroke", "darkorange");

    // add the dots with tooltips
    svg.selectAll("dot")
        .data(target)
        .enter().append("circle")
        .attr("r", 3)
        .attr("cx", function(d) {



            return x(d[labelX]);
        })
        .attr("cy", function(d) {
            //console.log(parseInt(y(d['Target'])));
            return isNaN(y(d['Target'])) ? 0 : y(d['Target']);
        })
        .attr("fill", "none")
        .attr("stroke-width", function(d) {
            return (isNaN(y(d['Target'])) || parseInt(y(d['Target'])) == 0) ? "0px" : "2px";
        })
        .attr("stroke", "#7cc576");

}

//Card 5 & 6 Donut chart

function processHomeChannelBulletData(json, counter) {
    var axis = [];
    var data = [],
        proj = [],
        target = [],
        labels = [];
    $.each(json.detail_trends, function(index, value) {
        //console.log(index, value);
        if (index === 0) {

            $.each(value[0], function(j, coll) {
                //console.log(j, coll);

                if (typeof coll === 'object') {
                    //console.log(coll);

                    var c = 0;
                    $.each(coll, function(k, d) {
                        //console.log(c, d);
                        if (c == 0) {
                            $.each(d, function(i, a) {
                                axis.push(a);
                                //console.log(i + '......' + a);
                            });
                            c++;
                        } else if (c == 1) {
                            var x = 0;
                            $.each(d, function(n, k) {
                                //console.log(k)
                                $.each(k, function(m, tday) {
                                    //console.log(tday);

                                    $.each(tday, function(i, a) {
                                        //console.log(a);
                                        var item = {};

                                        if (x == 0 && data.length < 3) {
                                            item[axis[0]] = i;
                                            item[axis[1]] = a;
                                            labels.push(i);
                                            data.push(a);
                                            //console.log(i + '......' + a);
                                        } else if (x == 1 && proj.length < 3) {
                                            item[axis[0]] = i;
                                            item['Target'] = a;
                                            target.push(a);
                                            //console.log(i + '......' + a);

                                        } else if (x == 2 && proj.length < 3) {
                                            item[axis[0]] = i;
                                            item['Projected'] = a;
                                            proj.push(a);
                                            //console.log(i + '......' + a);
                                        }
                                    });
                                    x++;
                                });

                            })

                        }
                    });

                }

            });

        }
    });


    //console.log('data', data);
    //console.log('proj', proj);
    //console.log('labels', labels);
    channelSummary_card(counter, data, proj, target, labels);
}

function processDataForDonut(selector, footer, json) {
    $(selector).empty();
    $.each(json.collection, function(index, value) {
        if (index == 0) {
            var arr = [];
            var count = 0;
            var xaxis, yaxis;
            $.each(value, function(index, v) {
                //console.log(value);

                if (typeof v === 'object' && count == 1) {
                    xaxis = v.x_axis;
                    yaxis = v.y_axis;
                } else if (typeof v === 'object' && count == 2) {
                    $.each(v[yaxis], function(d) {

                        $.each(v[yaxis][d], function(i, k) {
                            var item = {};
                            item[xaxis] = i;
                            item[yaxis] = k;
                            arr.push(item);


                            if (arr.indexOf(item) == 0) {
                                arr[arr.indexOf(item)]['col'] = "#d5406a";
                            } else if (arr.indexOf(item) == 1) {
                                arr[arr.indexOf(item)]['col'] = "#0d6580";

                            } else if (arr.indexOf(item) == 2) {
                                arr[arr.indexOf(item)]['col'] = "#21daa0";

                            } else if (arr.indexOf(item) == 3) {
                                arr[arr.indexOf(item)]['col'] = "#D3885F";

                            } else if (arr.indexOf(item) == 4) {
                                arr[arr.indexOf(item)]['col'] = "#0B94FF";

                            } else {
                                arr[arr.indexOf(item)]['col'] = "black";
                            }

                            //console.log(arr[arr.indexOf(item)][xaxis] + '.....' + arr[arr.indexOf(item)]['col']);


                            //console.log( + '-----' + item);
                        });
                    });

                    renderChannelSummaryDonut(selector, arr, xaxis, yaxis);
                    renderChannelSummarylegends(footer, arr, xaxis);
                }

                count++;

            });
        }
    });


}

function channelSummary_card(counter, actual, projected, target, labels) {
    //console.log('This is card : ' + counter);
    for (var i = 1; i <= 3; i++) {
        var states = [];
        states[0] = actual[i - 1];
        states[1] = projected[i - 1];
        states[2] = target[i - 1];
        var bulletHomeheight = 20;
        var colorCodes = [];
        var legends;
        if (i == 1) {
            colorCodes['actual'] = "#d5406a";
            legends = 'legend-affiliate';
        } else if (i == 2) {
            colorCodes['actual'] = "#0d6580";
            legends = 'legend-display';
        } else if (i == 3) {
            colorCodes['actual'] = "#21daa0";
            legends = 'legend-paid';
        }



        colorCodes['target'] = "#00bb00",
            colorCodes['projected'] = "#e6e6e6";

        //console.log('cols', colorCodes);
        //console.log(states);

        var id = 'channel_bullet' + counter + '_' + i;

        $('[data-role=page] .c3-fig' + i + ':eq(' + counter + ')').attr("id", id);
        //console.log($('[data-role=page] .c3-fig' + i + ':eq(' + counter + ')').attr('id'));
        //$('[data-role=page] .c1-fig2:last').attr("id",'today_bullet2'+index);
        if (typeof states[2] == 'undefined') states[2] = 0;
        if (typeof states[1] == 'undefined') states[1] = 0;
        if (typeof states[0] == 'undefined') states[0] = 0;
        //console.log(states, 'states', counter); // all values and labels 
        var str1 = '<span>' + labels[i - 1] + '</span>';
        str1 += '<span class="legend-text ' + legends + '">' + kFormatter(actual[i - 1]) + '</span>';
        str1 += '<span class="legend-text legend-prj">' + kFormatter(projected[i - 1]) + '</span>';
        //$("[data-role=page] .c3-h1:eq(" + counter + ")").html(kFormatter(states[0]));
        //console.log(str1);
        var hid = 'hc-' + counter + '-' + i;
        $("[data-role=page] .c3-h" + i + ":eq(" + counter + ")").attr('id', hid);
        $('#' + hid).html(str1);
        //$("[data-role=page] .p1:eq(" + counter + ") span:last").html(kFormatter(states[2]));
        var trafficStackData = [{ "title": labels[i - 1], "ranges": [states[2]], "measures": [states[0]], "markers": [states[1]] }];
        renderHomeBullet("#" + id, trafficStackData, colorCodes, bulletHomeheight);
    }

}


function renderChannelSummarylegends(selectorId, data, labelX) {
    var p = document.createElement('p');
    $(selectorId).html('');
    //console.log(data);
    $.each(data, function(i, d) {
        //console.log(d);
        var span = document.createElement('span');
        $(span).addClass('legend-text');
        //console.log(i + '------' + d);
        if (i == 0) {
            $(span).addClass('legend-affiliate');
        } else if (i == 1) {
            $(span).addClass('legend-display');
        } else if (i == 2) {
            $(span).addClass('legend-paid');
        } else if (i == 3) {
            $(span).addClass('legend-organic');
        } else {
            $(span).addClass('legend-other');
        }
        $(span).text(d[labelX]);
        p.appendChild(span);
        //console.log(span);
    });
    var span = document.createElement('span');
    $(span).addClass('legend-text');
    $(span).addClass('legend-prj');
    $(span).text('Projected');
    p.appendChild(span);


    $(selectorId).append(p);
}



function renderChannelSummaryDonut(selector, dat, labelX, labelY) {
    var width = $(selector).width(),
        height = width,

        radius = Math.min(width, height) / 2;

    var svg = d3.select(selector)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g");



    svg.append("g")
        .attr("class", "slices");
    svg.attr("padding", "0px");
    svg.attr("margin", "0px");
    svg.attr("height", height);


    svg.append("g")
        .attr("class", "labels");
    svg.append("g")
        .attr("class", "lines");


    //console.log(width, 'width', height, 'height');
    var pie = d3.layout.pie()
        //.padAngle(.02)
        .sort(null)
        .value(function(d) {
            return d.value;
        });

    var arc = d3.svg.arc()
        .outerRadius(radius * 0.8)
        .innerRadius(radius * 0.6);

    var innerArc = d3.svg.arc()
        .innerRadius(radius * 0.8)
        .outerRadius(radius * 0.6);

    var outerArc = d3.svg.arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9);

    svg.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");


    var key = function(d) {
        return d.data.label;
    };


    var color = d3.scale.ordinal()
        .domain($.map(dat, function(el) {
            return el[labelX];
        }))
        .range($.map(dat, function(el) {
            return el['col'];
        }));

    var labels = color.domain();
    var dataDo = dat.map(function(d) {
        //console.log(d);
        return {
            label: d[labelX],
            value: d[labelY] / 100
        }
    });

    change(dataDo);

    function change(data) {

        /* ------- PIE SLICES -------*/
        var slice = svg.select(".slices").selectAll("path.slice")
            .data(pie(data), key);
        var slice2 = svg.select(".slices").selectAll("path.slice2")
            .data(pie(data), key);

        slice.enter()
            .insert("path")
            .style("fill", function(d) {
                return color(d.data.label);
            })
            .attr("class", "slice");

        slice2.enter()
            .insert("path")
            .style("fill", 'white')
            .attr("class", "slice2");

        var text = slice2.enter().append("text")
            //.attr("dy", function(d,i) { return (d.endAngle > 90 * Math.PI/180 ? 18 : -11); })
            .attr("transform", function(d, i, j) {
                var c = innerArc.centroid(d);
                //console.log(j)
                if (j == 0) {
                    if (i == 1) {
                        var xCor = (c[0]) / 1.6; //inner right
                        var yCor = (c[1]) / 1.3;
                        // console.log(d.value)
                    } else {
                        //Inner left
                        var xCor = (c[0]) / 1.6;
                        var yCor = (c[1]) / 1.5; //Inner vertical  

                    }

                } else {
                    var yCor, xCor;

                    if (i == 1) { //RHS Outer
                        yCor = c[1] / .7;
                        xCor = c[0] / .58
                    } else { //Outer vertical
                        yCor = c[1] / .64;
                        xCor = c[0] / .59
                    }
                }
                //console.log(d)

                return "translate(" + xCor + "," + yCor + ")";
            })
            .style("text-anchor", "middle")
            .attr("fill", function(d, i) {
                //return color[i] ; 
                return "#000";
            })
            .style("font-size", "8px")
            .text(function(d, i, j) { return (d.value * 100).toFixed(0) + "%" })


        slice2
            .transition().duration(1000)
            .attrTween("d", function(d) {
                this._current = this._current || d;
                var interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(0);
                return function(t) {
                    return innerArc(interpolate(t));
                };
            })

        slice.exit()
            .remove();





        slice
            .transition().duration(1000)
            .attrTween("d", function(d) {
                this._current = this._current || d;
                var interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(0);
                return function(t) {
                    return arc(interpolate(t));
                };
            })

        slice.exit()
            .remove();

    }

}