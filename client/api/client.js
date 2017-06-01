import firebase from 'firebase/app';
import { omitBy, isUndefined, lowerCase, forEach } from 'lodash';
import * as constants from './constants';
import 'firebase/auth';
import 'firebase/database';

const USERS_PATH = '/users';
const SURVEYS_PATH = '/surveys';
const NOMINEES_PATH = '/nominees';
const ORGANIZATIONS_PATH = '/organizations';

const config = {
  apiKey: 'AIzaSyCQnvhtra0swrYaGvwSFiavtkKwdwSQd6g',
  authDomain: 'ashoka-social-api.firebaseapp.com',
  databaseURL: 'https://ashoka-social-api.firebaseio.com',
  projectId: 'ashoka-social-api',
  storageBucket: 'ashoka-social-api.appspot.com',
  messagingSenderId: '374901402447'
};

const userValues = (availableValues, userId) => {
  const data = {};
  constants.USER_VALUES.forEach((value) => {
    data[`${USERS_PATH}/${userId}/${value}`] = availableValues[value];
  });
  data[`${USERS_PATH}/${userId}/id`] = userId;
  data[`${USERS_PATH}/${userId}/sortName`] = lowerCase(
    `${availableValues.firstName} ${availableValues.lastName}`
  );
  return omitBy(data, isUndefined);
};

const surveyValues = (availableValues, userId, profileId) => {
  const data = {};
  forEach(availableValues, (value, key) => {
    if (!constants.USER_VALUES.includes(key) && value) {
      data[`${SURVEYS_PATH}/${profileId}/${key}`] = value;
    }
  });
  data[`${SURVEYS_PATH}/${profileId}/userId`] = userId;
  return data;
};

class apiClient {
  constructor() {
    firebase.initializeApp(config);
  }

  authenticated = (callback) => {
    return firebase.auth().onAuthStateChanged(callback);
  };

  login = (email, password) => {
    return firebase.auth().signInWithEmailAndPassword(email, password);
  };

  logout = () => {
    return firebase.auth().signOut();
  };

  requestPasswordReset = (email) => {
    return firebase.auth().sendPasswordResetEmail(email);
  };

  createUser = (details) => {
    const ref = firebase.database().ref();
    let data;
    let userId;
    if(details.hasOwnProperty('key')) {
      const { key, ...userDetails } = details; // eslint-disable-line
      userId = key;
      data = userValues(userDetails, userId);
    } else {
      const profileId = ref.push().key;
      userId = ref.push().key;
      data = {
        ...userValues(details, userId),
        ...surveyValues(details, userId, profileId)
      };
    }
    return ref.update(data).then(() => (userId));
  };

  getUser = (userId) => {
    const ref = firebase.database().ref(`${USERS_PATH}/${userId}`);
    return ref.once('value').then(response => ({ response: response.val() }));
  };

  listUsers = (cursor = null, limit = 10) => {
    const ref = firebase.database().ref(USERS_PATH);
    return ref.orderByChild('firstName')
      .startAt(cursor)
      .limitToFirst(limit)
      .once('value')
      .then(response => ({ response: response.val() }));
  };

  searchUsers = (query) => {
    const ref = firebase.database().ref(USERS_PATH);

    if (!query) {
      return Promise.resolve({ response: [] });
    }

    return ref
      .orderByChild('sortName')
      .startAt(query)
      .endAt(`${query}\u{f8ff}`)
      .once('value')
      .then(response => ({ response: response.val() }));
  };

  createNominee = (details) => {
    let ref = firebase.database().ref(NOMINEES_PATH);
    const data = omitBy(details, isUndefined);
    let nomineeId;
    if(details.hasOwnProperty('key')) {
      nomineeId = details.key;
    } else {
      ref = ref.push();
      nomineeId = ref.key;
      data.nominatedBy = firebase.auth().currentUser.uid;
    }
    data.id = nomineeId;
    data.sortName = lowerCase(`${data.firstName} ${data.lastName}`);
    return ref.update(data).then(() => (nomineeId));
  };

  getNominee = (nomineeId) => {
    const ref = firebase.database().ref(`${NOMINEES_PATH}/${nomineeId}`);
    return ref.once('value').then(response => ({ response: response.val() }));
  };

  listNominees = (cursor = null, limit = 10) => {
    const ref = firebase.database().ref(NOMINEES_PATH);
    return ref.orderByChild('firstName')
      .startAt(cursor)
      .limitToFirst(limit)
      .once('value')
      .then(response => ({ response: response.val() }));
  };

  searchNominees = (query) => {
    const ref = firebase.database().ref(NOMINEES_PATH);

    if (!query) {
      return Promise.resolve({ response: [] });
    }

    return ref
      .orderByChild('sortName')
      .startAt(query)
      .endAt(`${query}\u{f8ff}`)
      .once('value')
      .then(response => ({ response: response.val() }));
  };

  listOrganizations = (cursor = null, limit = 10) => {
    const ref = firebase.database().ref(ORGANIZATIONS_PATH);
    return ref.orderByChild('name')
      .startAt(cursor)
      .limitToFirst(limit)
      .once('value')
      .then(response => ({ response: response.val() }));
  };

  getOrganization = (organizationId) => {
    const ref = firebase.database().ref(`${ORGANIZATIONS_PATH}/${organizationId}`);
    return ref.once('value').then(response => ({ response: response.val() }));
  };
}

const client = new apiClient();

export default client;
