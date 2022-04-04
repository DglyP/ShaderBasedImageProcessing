const gaussianVertexShader = `
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    precision highp float;
    in vec3 position;
    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );
    }`


const gaussianFragmentShader = `
    precision highp float;
    uniform sampler2D image;
    uniform float sigma;
    uniform int kernelSize;
    uniform bool firstPass;
    uniform vec2 resolution;
    uniform float colorScaleR;
    uniform float colorScaleG;
    uniform float colorScaleB;
    const float pi = 3.14159265f;
    
    out vec4 out_FragColor;


    // t: value of one of the components (x or y) of the pixel
    // sigma: standard deviation of gaussian kernel
    float gaussian_kernel(float t, float sigma) {
      return exp(-(pow(t, 2.0) / (2.0 * pow(sigma, 2.0))));
    }
    
    void main(void) {
    
      vec4 textureValue = vec4(0, 0, 0, 0);
      int kernelSizeDiv2 = kernelSize / 2;
    
      float kernelSum = 0.0;
      
      if(firstPass) {
        for (int i = -kernelSizeDiv2; i <= kernelSizeDiv2; i++) {
          float gaussian_value = gaussian_kernel(float(i), sigma);
          kernelSum += gaussian_value;
          textureValue += gaussian_value * texelFetch( image, ivec2(i + int(gl_FragCoord.x ), i + int(gl_FragCoord.y )), 0 );
        }

      } else {
        for (int j = -kernelSizeDiv2; j <= kernelSizeDiv2; j++) {
          float gaussian_value = gaussian_kernel(float(j), sigma);
          kernelSum += gaussian_value;
          textureValue += gaussian_value * texelFetch( image, ivec2(j +int(gl_FragCoord.x ), j + int(gl_FragCoord.y)), 0 );
        }
      }
    
      textureValue /= kernelSum;
      out_FragColor = vec4(vec3(colorScaleR,colorScaleG,colorScaleB),1.0) * textureValue ;
      }
      `
  export {gaussianVertexShader, gaussianFragmentShader}