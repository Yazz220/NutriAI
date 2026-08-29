const React = require('react');
const { View } = require('react-native');

function SvgMock(props) {
  return React.createElement(View, { ...props, testID: props.testID ?? 'svg-mock' });
}

module.exports = SvgMock;
module.exports.default = SvgMock;
