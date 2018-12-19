import {ajax} from 'discourse/lib/ajax';
import {withPluginApi} from 'discourse/lib/plugin-api';


const apiKey = '7b0fe63c318a36c604fa7b5c3e350c70b378553a405b01e75d3d98a92dfdbacd';
const username = 'daniel.turner';
const queryEnd = `?api_key=${apiKey}&api_username=${username}`;

const apiAccess = {api_key: apiKey, api_username: username};
let renderPage = false;
// This is needs to be updated and checked for each instance
const liveCategory = {
  name: 'Live Management',
  id: 16,
  slug: 'live-management',
};
const nextCategory = {
  name: 'Next Management',
  id: 17,
  slug: 'next-management',
};

var year   = undefined;
var month  = undefined;
var day    = undefined;
var hour   = undefined;
var minute = undefined;
var second = undefined;
var newTime = false;

function getTimeRemaining(endtime) {
  var t = Date.parse(endtime) - Date.parse(new Date());
  if (t <= 0) {
    return {
      'total': 0,
      'days': 0,
      'hours': 0,
      'minutes': 0,
      'seconds': 0
    };
  }
  var seconds = Math.floor((t / 1000) % 60);
  var minutes = Math.floor((t / 1000 / 60) % 60);
  var hours = Math.floor((t / (1000 * 60 * 60)) % 24);
  var days = Math.floor(t / (1000 * 60 * 60 * 24));
  return {
    'total': t,
    'days': days,
    'hours': hours,
    'minutes': minutes,
    'seconds': seconds
  };
}

function initializeClock(id, endtime) {
  var clock = document.getElementById(id);
  var daysSpan = clock.querySelector('.days');
  var hoursSpan = clock.querySelector('.hours');
  var minutesSpan = clock.querySelector('.minutes');
  var secondsSpan = clock.querySelector('.seconds');

  function updateClock() {
    if (newTime) {
      endtime = new Date(year, month, day, hour, minute, second);
      newTime = false;
    }
    var t = getTimeRemaining(endtime);

    var dayValue = ('0' + t.days).slice(-2);
    daysSpan.innerHTML = dayValue;

    var hourValue = ('0' + t.hours).slice(-2);
    hoursSpan.innerHTML = hourValue

    var minuteValue = ('0' + t.minutes).slice(-2);
    minutesSpan.innerHTML = minuteValue;

    var secondValue = ('0' + t.seconds).slice(-2);
    secondsSpan.innerHTML = secondValue
    if (dayValue == '01') {
      daysSpan.nextElementSibling.innerHTML = "Day";
    } else if (dayValue == '00'){
      var div = document.querySelector("#clockdiv > div:nth-child(1)");
      div.style.display = "none";
    } else {
      daysSpan.nextElementSibling.innerHTML = "Days";
    }
    if (hourValue == '01') {
      hoursSpan.nextElementSibling.innerHTML = "Hour";
    } else {
      hoursSpan.nextElementSibling.innerHTML = "Hours";
    }
    if (minuteValue == '01') {
      minutesSpan.nextElementSibling.innerHTML = "Minute"
    } else {
      minutesSpan.nextElementSibling.innerHTML = "Minutes"
    }
    if (secondValue == '01') {
      secondsSpan.nextElementSibling.innerHTML = "Second"
    } else {
      secondsSpan.nextElementSibling.innerHTML = "Seconds"
    }

    if (t.total <= 0) {
      clearInterval(timeinterval);
    }
  }

  updateClock();
  var timeinterval = setInterval(updateClock, 1000);
}

function resolveTopic(res, arr, i) {
  const body = res.post_stream.posts[0].cooked;
  let lines = [];
  let time = '';
  let url = '';
  let speakers = [];
  let other = '';
  let description = '';
  let favicon = '';
  let faviconColor = '';
  lines = body.split('<br>');
  lines.forEach((text) => {
    let line = text;
    line = line.replace('<p>', '');
    line = line.replace('</p>', '');
    line = line.trim();
    if (line.startsWith('Actual URL:' || line.startsWith('URL:') || line.startsWith('url:'))) {
      url = line.split(':')[1].trim();
    }
    else if (line.startsWith('Time=') || line.startsWith('time=')) {
      time = line.split('=')[1].trim();
    }
    else if (line.startsWith('Speakers:') || line.startsWith('speakers:')) {
      speakers = line.split(':')[1].trim().split(',');
      if (speakers.length === 1 && speakers[0] === '') {
        speakers = [];
      }
    }
    else if (line.startsWith('Other:') || line.startsWith('other:')) {
      other = line.split(':')[1].trim();
    }
    else if (line.startsWith('Description:') || line.startsWith('description:')) {
      description = line.split(':')[1].trim();
    }
    else if (line.startsWith('Favicon:') || line.startsWith('favicon:')) {
      favicon = line.split(':')[1].trim();
    }
    else if (line.startsWith('Favicon-color:') || line.startsWith('favicon-color:') ||
    line.startsWith('Favicon-colour:') || line.startsWith('favicon-colour:')) {
      faviconColor = line.split(':')[1].trim();
    }
  });

  arr[i].url = url;
  arr[i].time = time;
  arr[i].speakers = speakers;
  arr[i].other = other;
  arr[i].description = description;
  arr[i].favicon = favicon;
  arr[i].faviconColor = faviconColor;
}

function getCategoryCallback(result, component, componentString) {
  if (result && result.topic_list) {
    const topics = result.topic_list.topics;
    const arr = [];
    const topicPromiseArr = [];
    for (let i = 0; i < topics.length; i += 1) {
      if (!(topics[i].title.startsWith('About the')) && topics[i].closed === false) {
        arr.push(topics[i]);
        const p1 = ajax(`/t/${topics[i].id}.json${queryEnd}`);
        topicPromiseArr.push(p1);
      }
    }
    Promise.all(topicPromiseArr).then((values) => {
      values.forEach((value, index) => {
        resolveTopic(value, arr, index);
      });
    }).then(() => {
      component.set(componentString, arr);
    }).catch((e) => {
      console.log('Promise error:');
      console.log(e);
    });
  }
}

var contentId = 139;
// var contentId = 22;

function initializePlugin(api, component) {
  ajax({
    url: `/t/${contentId}.json`,
    data: apiAccess,
  }).then((res) => {
    let body = res.post_stream.posts[0].cooked;
    body = body.replace('<p>', '');
    body = body.replace('</p>', '');
    const lines = body.split('<br>');
    for (var loop = 0; loop < lines.length; loop++){
      var line = lines[loop].replace(/(\r\n|\n|\r)/gm,"");
      let x = '';
      let type = '';
      if (line.startsWith('clockTime')) {
        var time = line.split('@')[1].trim();
        var values = time.split(':');
        year   = values[0];
        month  = values[1];
        day    = values[2];
        hour   = values[3];
        minute = values[4];
        second = values[5];
        newTime = true;
      }

      if (line.startsWith('video')) {
        x = line.split('@')[1].trim().replace(/(<([^>]+)>)/ig, '');
        type = 'video';
      }
      else if (line.startsWith('image')) {
        x = line.split('@')[1].trim().replace(/(<([^>]+)>)/ig, '');
        type = 'image';
      }
      else if (line.startsWith('other')) {
        x = line.split('@')[1].trim();
        type = 'other';
      }
      else if (line.startsWith('clocktitle')) {
        x = line.split('@')[1].trim();
        type = 'clocktitle';
      }
      else if (line.startsWith('livestream')) {
        x = line.split('@')[1].trim().replace(/(<([^>]+)>)/ig, '');
        type = 'live';
      }
      if (x !== '') {
        component.set(type, x);
      }
    }
  });

  api.onPageChange((url) => {
    switch (window.location.pathname) {
      case '/':
      case '/categories':
        document.getElementById('main-outlet').style.display = 'block';
        break;
      default:
        document.getElementById('main-outlet').style.display = 'block';
        break;
    }

    if (url === '/' || url === '/categories') {
      renderPage = true;

      // get the live_category topic list
      ajax(`/c/${liveCategory.id}.json${queryEnd}`).then((res) => {
        getCategoryCallback(res, component, 'live-topics');
      }).catch((e) => {
        console.log('A liveCategory error occurred: ');
        console.log(e);
      });

      // get the next_category topic list
      ajax(`/c/${nextCategory.id}.json${queryEnd}`).then((res) => {
        getCategoryCallback(res, component, 'next-topics');
      }).catch((e) => {
        console.log('A nextCategory error occurred: ');
        console.log(e);
      });

      // clock stuff
      let deadline = new Date(year || 2017, month || 8, day || 25, hour || 12, minute || 0, second || 0);
      setTimeout(function() {
        initializeClock('clockdiv', deadline);
      }, 500);
    }
    else {
      renderPage = false;
    }
    component.set('renderPage', renderPage);
  });
}

export default {
  setupComponent(args, component) {
    withPluginApi('0.8', api => initializePlugin(api, component, args));
  },
};
