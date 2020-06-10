# Internet-Monitor

This is a simple node js app that I wrote to monitor my home internet connection. The code should be self explanatory in main.js. Requirements are node.js, npm, and pinglist to your choice.

This is extremely basic and naieve implementation with almost no error handling and thought put into it. It might work for your purpose but I can't gaurantee it. I used it to setup an internet monitoring station on Raspberry Pi as I suspected I was having intermittent internet drops.

Run as
```
$ node main.js
```

After that, visit the website and everytime you reload it will have the latest information. Failures are currently reported as zero.