# React Native HTML 2 Native
A component which takes HTML content and renders it as native views.

### Props

- `value`: a string of HTML content to render
- `onLinkPress`: a function which will be called with a url when a link is pressed.
  Passing this prop will override how links are handled (defaults to calling `Linking.openURL(url)`)
- `stylesheet`: a stylesheet object keyed by tag name, which will override the 
  styles applied to those respective tags.
- `renderNode`: a custom function to render HTML nodes however you see fit. If 
  the function returns `undefined` (not `null`), the default renderer will be 
  used for that node.

### example

```js
import React, { Component } from 'react'
import ReactNative from 'react-native'
const { Text, View, ListView } = ReactNative

const HTMLView = require('react-native-html2native')

class App extends Component {
  render() {
    const content = '<p><a href="http://google.com">Google it FTW!</a></p>'

    return (
      <HTMLView
        value={content}
        stylesheet={styles}
      />
    )
  }
})

const styles = StyleSheet.create({
  a: {
    fontWeight: '300',
    color: '#FF0000'
  }
})
```

When a link is clicked, by default `ReactNative.Linking.openURL` is called with the 
link url. You can customise what happens when a link is clicked with `onLinkPress`:

```js
import React, { Component } from 'react'
import ReactNative from 'react-native'

class ContentView extends Component {
  render() {
    return (
      <HTMLView
        value={this.props.html}
        onLinkPress={(url) => console.log('Link clicked: ', url)}
      />
    )
  }
})
```
