babel-plugin-expose
===================================

A babel plugin that exposes ES6 modules to global namespace.

##Usage
This is a [babel plugin](https://babeljs.io/docs/advanced/plugins/) that converts ES6 modules into global variables. To use it, just add it to your package.json and pass it as a plugin when calling babel:

```javascript
babel.transform('code', {
  filename: filename,
  plugins: ['expose']
});
```
