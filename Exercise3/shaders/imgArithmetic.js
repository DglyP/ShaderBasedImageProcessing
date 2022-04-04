const arithmeticVertexShader = `
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    precision highp float;
    in vec3 position;
    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );
    }
`

const arithmeticFragmentShader = `
    precision highp float;
    uniform float scale;
    uniform float centerX;
    uniform float centerY;
    uniform sampler2D image;
    uniform sampler2D image2;
    uniform int operation;
    uniform float mergeAmount;
    uniform float scaleFactor;
    uniform float offset;
    uniform vec2 resolution;
    uniform float colorScaleR;
    uniform float colorScaleG;
    uniform float colorScaleB;
    const float pi = 3.14159265f;
    
    out vec4 out_FragColor;


    vec2 scale_coord(vec2 pt, float scale) {
        mat2 scale_mat = mat2(scale, 0, 0, scale);
        return scale_mat * pt;
    }
    
    void main(void) {
                    vec2 center = vec2(centerX, centerY);
                    vec4 textureValue = vec4 ( 0,0,0,0 );				
                    textureValue += texelFetch( image, ivec2(int(gl_FragCoord.x), int(gl_FragCoord.y)), 0 );
                    vec4 textureValue2 = vec4 ( 0,0,0,0 );
                    textureValue2 += texelFetch( image2, ivec2(int(gl_FragCoord.x + centerX), int(gl_FragCoord.y + centerY)), 0 );

                    if(operation == 0) {
                        textureValue.rgb += ( textureValue2.rgb * mergeAmount ) ;
                      } else if (operation == 1) {
                        textureValue.rgb -= ( textureValue2.rgb * mergeAmount );
                      } else if (operation == 2) {
                        textureValue.rgb *= ( textureValue2.rgb * mergeAmount );
                      } else if (operation == 3) {
                        textureValue.rgb /= ( textureValue2.rgb * mergeAmount );
                      }

                    out_FragColor = vec4(vec3(colorScaleR,colorScaleG,colorScaleB),1.0) * textureValue * scaleFactor + offset;
            }
`

export {arithmeticVertexShader, arithmeticFragmentShader}
