
'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const nodemailer = require('nodemailer');


//To set this configs use this command
//firebase functions:config:set gmail.email="myusername@gmail.com" gmail.password="secretpassword"
const gmailEmail = encodeURIComponent(functions.config().gmail.email);
const gmailPassword = encodeURIComponent(functions.config().gmail.password);
const mailTransport = nodemailer.createTransport(`smtps://${gmailEmail}:${gmailPassword}@smtp.gmail.com`);

const APP_NAME = 'React Most Wanted';

const chat = require('./chat');
const counting = require('./counting');
const messaging = require('./messaging');
const userNotifications = require('./userNotifications');
const userSync = require('./userSync');

exports.handleUserChatMessageCreate = functions.database.ref('/user_chat_messages/{senderUid}/{receiverUid}/{messageUid}').onCreate(
  (event)=> {
    return Promise.all([
      chat.handleUserChatMessageCreate(event, admin),
    ])
  }
);


exports.handleTasksChange = functions.database.ref('/public_tasks/{taskUid}').onWrite(
  (event)=> {
    return Promise.all([
      counting.handleListChange(event, 'public_tasks_count'),
      messaging.handleTaskAdded(event, admin)
    ])
  }
);

exports.handlePublicChatChange = functions.database.ref('/public_chats/{taskUid}').onWrite(
  (event)=> {
    return Promise.all([
      messaging.handlePublicMessageAdded(event, admin)
    ])
  }
);

exports.recountTasks = functions.database.ref('/public_tasks_count').onWrite(
  (event)=> counting.handleRecount(event, 'public_tasks')
);

exports.handleUserChange = functions.database.ref('/users/{userUid}').onWrite(
  (event)=> {
    return Promise.all([
      counting.handleListChange(event, 'users_count'),
      userSync.syncPublicTasks(event, admin),
      userSync.syncPublicChats(event, admin)
    ])
  }
);

exports.recountUsers = functions.database.ref('/users_count').onWrite(
  (event)=> {
    return Promise.all([
      counting.handleRecount(event, 'users', 8),
      counting.handleProviderRecount(event, admin)
    ])
  }
);

exports.handleUserCreated = functions.auth.user().onCreate(
  (event)=> {
    return Promise.all([
      userSync.populateUserRegistrationChartsPerDay(event, admin),
      userSync.populateUserRegistrationChartsPerMonth(event, admin),
      userSync.updateProviderCount(event, admin),
      userNotifications.sendWelcomeEmail(event, mailTransport, APP_NAME)
    ])
  }
);


exports.handleUserDeleted = functions.auth.user().onDelete(
  (event)=> {
    return Promise.all([
      userNotifications.sendByeEmail(event, mailTransport, APP_NAME),
      userSync.userDeleted(event, admin)
    ])
  }
);


//Authorisation - START
exports.handleRoleChange = functions.database.ref('/roles/{roleUid}').onWrite(
  (event)=> {
    return Promise.all([
      authorisation.handleRoleChange(event, admin)
    ])
  }
);

exports.handleRoleGrantChange = functions.database.ref('/role_grants/{roleUid}/{grantUid}').onWrite(
  (event)=> {
    return Promise.all([
      authorisation.handleRoleGrantChange(event, admin)
    ])
  }
);

exports.hanldeUserRoleChange = functions.database.ref('/user_roles/{userUid}/{roleUid}').onWrite(
  (event)=> {
    return Promise.all([
      authorisation.hanldeUserRoleChange(event, admin)
    ])
  }
);
//Authorisation - END
