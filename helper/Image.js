import { Component }  from 'react';
import {
  Image,
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window')

const baseStyle = {
  backgroundColor: 'transparent'
}

export default class ResizableImage extends Component {
  getInitialState() {
    return {
      // set width 1 is for preventing the warning
      // You must specify a width and height for the image %s
      width: this.props.style.width || 1,
      height: this.props.style.height || 1
    }
  }

  componentDidMount() {
    //avoid repaint if width/height is given
    if (this.props.style.width || this.props.style.height) {
      return
    }
    Image.getSize(this.props.source.uri, (w, h) => {
      this.setState({ width: w, height: h })
    })
  }

  render() {
    const finalSize = {}
    if (this.state.width > width) {
      finalSize.width = width
      finalSize.height = this.state.height * (width / this.state.width)
    }
    const style = Object.assign(baseStyle, this.props.style, this.state, finalSize)
    let source = {}
    if (!finalSize.width || !finalSize.height) {
      source = Object.assign(source, this.props.source, this.state)
    } else {
      source = Object.assign(source, this.props.source, finalSize)
    }

    return (
      <Image style={style} source={source} />
    )
  }
}
