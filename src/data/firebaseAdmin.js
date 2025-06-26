import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "ranishicecreams",
      clientEmail: "firebase-adminsdk-fbsvc@ranishicecreams.iam.gserviceaccount.com",
      privateKey: "\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDaQfwbus7gDLBQ\naImHDmx9uaO6QfQ4S5eUSyoyIugbwDwQ1CSddVJfw7Mcm+Ne/PZ/66vwPIp0lRZ4\nr6VH5pChbSZiFSFOzVFGqcQBoS4XFQEj/EJ0SN5p+lvY+tDtjBQ0j75Ze5dUdRAw\nqh832FM2CSz2oWS7ZUxAa+IbNsYAAbzttwQ5e7pWFgsWYLZjBiCHsIPVzzG87GEo\n1DGcGCZLDdX5kJ206AhJrc52bhPynANLomnF5Yzux6UO/7XZraNE87Em1S5SOaR4\nhjFj6deiwnAGPZHUB5jC0D/OXaQjlLZbLnItayFpxfvfsJQeA9amupS1OjS3nmB6\nyiuV+CDDAgMBAAECggEANkCRrMjmNI4i45HgoaglsqjK+Hj9fmLX5l46umSv4noJ\n1DsPcO5hT/mi05kyTwG9OjX4MsqxteH7SHuMr48x41Zw5I+RDHf/3HtFhAwvG0C2\n3F2PnT0hwCEh5JEQDwQzX49dhvuwNae1owseoHCO2o80VIfwtJ4s8pR+izo1xHk0\nmtUvv/27WvBSKQh1s6yy1THezS11J/NiGAtdZoDmPRuaGIzh8vePl3+aMyeJFq0V\nj8t9Q0si6w7/jpg5kaYRo0AxqWQ0FLTRKySc61JZkYK33g+q7kH1E16h6HIwjfiS\nbxkEn3/rDVdwGGxBXfuox/FffQpn+n2HicFeZXoacQKBgQDumvl0IMXcCt5bCr2Z\nGXSgT/qkoBG5rDbYTsrVimGQdW0TT+lW8JsXKO7lacjj/srCg755qifBzGL1Bm4+\nxY236zTEG6g090ebXTtwbD2GjpM4/5wJHI+75ICUtE2eNKfmDPFhoJdYnHcvd/Wv\nMYt6W2e82xfDR8RpkGk599dDMQKBgQDqK0S7PQb/bvMvkoe0Tafe3mqbREmvlC1x\n2rqJIhNKTUAouCSHwdlR+f+Gp98FeOkAhoA0LAwEkYVfUkgHIxc7g5S3uvJNwJr2\nZh7yuJ8gP2c1UQQQsmzxlUQfHz803NfkHoGFrd/mS1r8dn8QWvevQBvXxl38WTTZ\nlGGuFhYeMwKBgQDS68HpyvK80gq/Nh5mER+Me0bYcftZQ4fz7KrW243lUjhKoxBk\n3ypp7bBIsht4mAoKqsUc7bJZWWB8suOPr7jYRR4O4VfvAkyVZXQerEAzCyPPdf0r\n/Mh+Ur7rNPuMB4YIEZbrMze2iBG/r25KISTn05c/VfmKkY1pt9Oc/56VcQKBgCpO\nJtys6da79LNjhaDNZsac6CWk8KsH2i33ljuwLEwAKNcybWcZXmmxALkTGveiIHY3\n1nGWg5VPtQjDlL+1Vz0pSHTpEV16roRVbsHrGNR6n+rB+DoMAiKjFOuKeaDTRS2x\nVTURdKHme0mhHtOVm6nNqzoQXGp6s1GbvQn2c4iBAoGAN//MfOCTgnB/P2mS8HUF\n0/GLOE3/8NNqryIDp9k63lFWJhs6H3l4H1k+9T2mvUq41WTieo1jzdGa5H0fLdW5\nfdvh9PUoJnDMaGDcMQVjr5CTZ2NROdWJOgGnoxO6TcYmhYMkQchu74ic+N52GuZ4\npD45X9jJuI8q1p41cAiRvD4=\n\n".replace(/\\n/g, '\n'),
    }),
    storageBucket: "ranishicecreams.appspot.com",
  });
}

const bucket = admin.storage().bucket();
export { bucket };