var React = require('react-native')
var htmlParse = require('./htmlParse')

const BULLET = '  \u2022  '
const LINE_BREAK = '\n'

var {
    StyleSheet,
    Text,
    View,
    Component,
    Image,
    ScrollView,
    TouchableHighlight,
    TouchableOpacity,
    LinkingIOS,
    PropTypes,
    Dimensions
    } = React

var {height,width} = Dimensions.get('window')

function rendCodeBlock(codeText, styles) {
    var codeLines = codeText.split('\n')
    return codeLines.map(function (line, index, arr) {
        var lineNum = index + 1;
        if (line == '') line = '\n';
        if (index == codeLines.length - 1) return null;
        return (
            <View key={'codeRow'+index} style={styles.codeRow}>
                <View style={styles.lineNumWrapper}>
                    <Text style={styles.lineNum}>
                        {lineNum + '.'}
                    </Text>
                </View>

                <View style={styles.codeLineWrapper}>
                    <Text style={styles.codeLine}>
                        {line}
                    </Text>
                </View>
            </View>
        )
    });
}

function getCodeRowStyle(num, length, styles) {
    if (num == 1 && length == num) {
        return [styles.codeRow, styles.codeFirstAndLastRow]
    }

    if (num == 1) {
        return [styles.codeRow, styles.codeFirstRow];
    }
    if (num == length) {
        return [styles.codeRow, styles.codeLastRow];
    }

    return styles.codeRow;
}


var htmlToElement = function (rawHtml, opts, done) {
    var styles = opts.styles;

    function domToElement(dom, parent, type) {
        if (!dom) return null;

        return dom.map((node, index, list) => {

            index = (parent ? parent.index + '-' : '' ) + index;
            node.tree = (parent ? parent.tree + '>' : '' ) + node.name;

            if (opts.customRenderer) {
                var rendered = opts.customRenderer(node, index, parent, type);
                if (rendered || rendered === null) return rendered
            }

            //console.log(node.name);
            //console.log(node.type);
            //console.log(node.attribs);

            var name = node.name;

            if(node.type === 'block' && name === 'div' && (!node.children || (!node.children && !node.text))) return null;
            if(node.type === 'inline' && type === 'inline' && name === 'text' && !node.text) return null;
            if(node.type == 'inline' && type == 'block') return null;

            if (name == 'text' && type == 'inline') {
                // ignore carriage return
                if (node.text.charCodeAt() === 13) return null;
                return (
                    <Text key={index} style={styles[parent.name]}>
                        {node.text}
                    </Text>
                )
            }

            if (node.type == 'inline') {

                if (name == 'a') {
                    return (
                        <Text
                            onPress={opts.linkHandler.bind(this, node.attribs.href)}
                            key={index} style={styles[name]}>
                            {domToElement(node.children, node, 'inline')}
                        </Text>
                    )
                }

                return (
                    <Text key={index} style={styles[name]}>
                        {domToElement(node.children, node, 'inline')}
                        {node.name == 'br' ? LINE_BREAK : null}
                    </Text>
                )
            }

            if (node.type == 'block' && type == 'block') {

                if (name == 'img') {
                    return (
                        <View
                            key={index}
                            style={styles.imgWrapper}>
                            <Image source={{uri: node.attribs.src}}
                                   style={styles.img}>
                            </Image>
                        </View>
                    )
                }

                if (name == 'code') {

                    var codeText = '';

                    node.children.forEach(function (code) {
                        codeText = codeText + code.text;
                    });

                    return (
                        <ScrollView
                            style={styles.codeScrollView}
                            horizontal={true}>
                            <View style={styles.codeWrapper}>
                                {rendCodeBlock(codeText, styles)}
                            </View>
                        </ScrollView>
                    )

                }

                node.index = index;

                const childrenInline = domToElement(node.children, node, 'inline');
                const childrenBlock = domToElement(node.children, node, 'block');

                return (
                    <View key={index} style={styles[name + 'Wrapper']}>
                        {opts.debug ?
                            <Text style={{color: '#ff0000'}}>
                                {node.index + ' ' + node.tree + (node.attribs.class ? ' (' + node.attribs.class + ')' : '' )
                                + childrenInline.length + ':' + childrenBlock.length}
                            </Text>
                            : null
                        }
                        { childrenBlock.length === 0 ? <Text>{childrenInline}</Text>: null }
                        { childrenBlock }
                    </View>
                )

            }

        }).filter(e => { return e === 0 || e })

    }

    htmlParse(rawHtml, function (dom) {
        console.log(dom)
        done(null, domToElement(dom, null, 'block'))
    })
}


class HtmlView extends Component {
    constructor(props) {
        super(props)
        this.state = {
            element: null
        }
    }

    componentWillReceiveProps() {
        if (this.state.element) return
        this.startHtmlRender()
    }

    componentDidMount() {
        this.startHtmlRender()
    }

    startHtmlRender() {
        if (!this.props.value) return
        if (this.renderingHtml) return

        var opts = {
            debug: this.props.debug,
            linkHandler: this.props.onLinkPress,
            styles: Object.assign({}, baseStyles, this.props.stylesheet),
            customRenderer: this.props.renderNode
        }

        this.renderingHtml = true
        htmlToElement(this.props.value, opts, (err, element) => {
            this.renderingHtml = false

            if (err) return (this.props.onError || console.error)(err)
            this.setState({
                element: element
            });
        });
    }

    render() {
        if (this.state.element) {
            return <View children={this.state.element} style={{flex:1}}/>
        }
        return <View />
    }
}

HtmlView.propTypes = {
    value: PropTypes.string,
    stylesheet: PropTypes.object,
    onLinkPress: PropTypes.func,
    renderNode: PropTypes.func
}

var fontSize = 16
var titleMargin = 15
var liFontSize = fontSize - 2

var baseStyles = StyleSheet.create({
    img: {
        flex: 1,
		    resizeMode: Image.resizeMode.ratio
    },
    imgWrapper: {
    		height: 200
    },
    p: {
        lineHeight: fontSize * 1.5,
        fontSize: fontSize,
        paddingTop: 5,
        paddingBottom: 5,
        color: 'rgba(0,0,0,0.8)'
    },
    pWrapper: {
        marginTop: 15,
        marginBottom: 15
    },
    a: {
        color: '#3498DB',
        fontSize: fontSize,
        paddingLeft: 4,
        paddingRight: 4,
        marginRight: 10,
        marginLeft: 10,
        fontFamily: 'Courier'
    },
    h1: {
        fontSize: fontSize * 1.6,
        fontWeight: "bold",
        color: 'rgba(0,0,0,0.8)'
    },
    h1Wrapper: {
        marginTop: titleMargin,
        marginBottom: titleMargin
    },
    h2: {
        fontSize: fontSize * 1.5,
        fontWeight: 'bold',
        color: 'rgba(0,0,0,0.85)'
    },
    h2Wrapper: {
        marginBottom: titleMargin,
        marginTop: titleMargin
    },
    h3: {
        fontWeight: 'bold',
        fontSize: fontSize * 1.4,
        color: 'rgba(0,0,0,0.8)'
    },
    h3Wrapper: {
        marginBottom: titleMargin - 2,
        marginTop: titleMargin - 2
    },
    h4: {
        fontSize: fontSize * 1.3,
        color: 'rgba(0,0,0,0.7)',
        fontWeight: 'bold'
    },
    h4Wrapper: {
        marginBottom: titleMargin - 2,
        marginTop: titleMargin - 2,
    },
    h5: {
        fontSize: fontSize * 1.2,
        color: 'rgba(0,0,0,0.7)',
        fontWeight: 'bold'
    },
    h5Wrapper: {
        marginBottom: titleMargin - 3,
        marginTop: titleMargin - 3,
    },
    h6: {
        fontSize: fontSize * 1.1,
        color: 'rgba(0,0,0,0.7)',
        fontWeight: 'bold'
    },
    h6Wrapper: {
        marginBottom: titleMargin - 3,
        marginTop: titleMargin - 3,
    },
    li: {
        fontSize: fontSize * 0.9,
        color: 'rgba(0,0,0,0.7)'
    },
    liWrapper: {
        paddingLeft: 20,
        marginBottom: 10
    },
    strong: {
        fontWeight: 'bold'
    },
    em: {
        fontStyle: 'italic'
    },
    code: {
        color: '#E74C3C',
        paddingLeft: 5,
        paddingRight: 5,
        fontFamily: 'Courier'

    },
    codeScrollView: {
        backgroundColor: '#333',
        flexDirection: 'column',
        marginBottom: 15
    },
    codeRow: {
        flex: 1,
        flexDirection: 'row',
        height: 25,
        alignItems: 'center'
    },
    codeFirstRow: {
        paddingTop: 20,
        height: 25 + 20
    },
    codeLastRow: {
        paddingBottom: 20,
        height: 25 + 20
    },
    codeFirstAndLastRow: {
        paddingBottom: 20,
        height: 25 + 40,
        paddingTop: 20
    },
    lineNum: {
        width: 55,
        color: 'rgba(255,255,255,0.5)',
    },
    lineNumWrapper: {
        width: 55,
        height: 25,
        backgroundColor: 'rgba(0,0,0,0.1)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 20,
    },
    codeLine: {
        color: '#E74C3C',
        fontFamily: 'Courier'
    },
    codeWrapper: {
        flexDirection: 'column'
    },
    codeLineWrapper: {
        height: 25,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 20
    },
    blockquoteWrapper: {
        paddingLeft: 20,
        borderLeftColor: '#3498DB',
        borderLeftWidth: 3
    }
})

module.exports = HtmlView
