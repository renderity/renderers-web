// import Base from './base';



export default class WebGL
{
	constructor (wasm)
	{
		const WasmWrapper = wasm.constructor;



		class Renderer extends wasm.Renderer
		{
			// dpr
			// renderer info (gl.getParameter(gl.SHADING_LANGUAGE_VERSION)...)
			constructor (addr_renderer, canvas, _context = 'webgl')
			{
				super(addr_renderer);

				this.exists = true;



				/* eslint-disable-next-line consistent-this */
				const renderer = this;



				this.canvas = canvas || document.createElement('canvas');

				this.canvas.width = this.original_struct.width;
				this.canvas.height = this.original_struct.height;

				this.canvas.style.width = `${ this.original_struct.width }px`;
				this.canvas.style.height = `${ this.original_struct.height }px`;

				this._context = this.canvas.getContext(_context);

				if (!this._context)
				{
					this.exists = false;

					return undefined;
				}



				this.loop_function = null;



				const gl = this._context;

				gl.viewport(0, 0, this.original_struct.width, this.original_struct.height);



				class Uniform extends wasm.Uniform
				{
					constructor (addr)
					{
						super(addr);



						this.location = null;

						// TODO: add multiple typed data initializers.
						this.typed_data = wasm.Floatv(this.object_addr, this.size / 4);
					}
				}

				this.Uniform = Uniform;



				class UniformBlock extends wasm.UniformBlock
				{
					constructor (addr)
					{
						super(addr);



						this.getUniforms(renderer);

						this.buffer = gl.createBuffer();

						gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
						gl.bindBufferBase(gl.UNIFORM_BUFFER, this.binding, this.buffer);
						gl.bufferData(gl.UNIFORM_BUFFER, this.buffer_length, gl.DYNAMIC_DRAW);

						// Initially update uniforms.
						this.use();

						// gl.bindBuffer(gl.UNIFORM_BUFFER, null);
					}

					use ()
					{
						gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);

						for
						(
							let uniform_index = 0;
							uniform_index < this.uniforms_seq.length;
							++uniform_index
						)
						{
							const uniform = this.uniforms_seq[uniform_index];

							gl.bufferSubData(gl.UNIFORM_BUFFER, uniform.block_index, uniform._data);
						}
					}
				}

				this.UniformBlock = UniformBlock;



				class Material extends wasm.Material
				{
					static TOPOLOGY =
						[
							gl.TRIANGLES,
							gl.POINTS,
							gl.LINES,
						];

					static FRONT_FACE =
						[
							gl.CCW,
							gl.CW,
						];



					constructor (addr)
					{
						super(addr);



						this.uniforms_seq = null;
						this.uniforms_dict = {};



						this.program = gl.createProgram();



						// vertex
						{
							let code = null;

							if (renderer._context.constructor === WebGLRenderingContext)
							{
								code =
								WasmWrapper.uint8Array2DomString(this.original_struct.glsl100es_code_vertex).trim();
							}
							else if (renderer._context.constructor === WebGL2RenderingContext)
							{
								code =
								WasmWrapper.uint8Array2DomString(this.original_struct.glsl300es_code_vertex).trim();
							}

							const shader = gl.createShader(gl.VERTEX_SHADER);

							gl.shaderSource(shader, code);

							gl.compileShader(shader);

							if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
							{
								const strOut =
								`\n${ code.split('\n').map((elm, i) => `${ i + 1 }:${ elm }`).join('\n') }\n`;

								throw new Error(`${ strOut }${ gl.getShaderInfoLog(shader) }`);
							}

							gl.attachShader(this.program, shader);
						}



						// fragment
						{
							let code = null;

							if (renderer._context.constructor === WebGLRenderingContext)
							{
								code =
								WasmWrapper.uint8Array2DomString(this.original_struct.glsl100es_code_fragment).trim();
							}
							else if (renderer._context.constructor === WebGL2RenderingContext)
							{
								code =
								WasmWrapper.uint8Array2DomString(this.original_struct.glsl300es_code_fragment).trim();
							}

							const shader = gl.createShader(gl.FRAGMENT_SHADER);

							gl.shaderSource(shader, code);

							gl.compileShader(shader);

							if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
							{
								const strOut =
								`\n${ code.split('\n').map((elm, i) => `${ i + 1 }:${ elm }`).join('\n') }\n`;

								throw new Error(`${ strOut }${ gl.getShaderInfoLog(shader) }`);
							}

							gl.attachShader(this.program, shader);
						}



						gl.linkProgram(this.program);



						// gl.useProgram(this.program);

						this.uniforms_seq =
							// TypedArray::map returns TypedArray, but need Array.
							Array.from(this.original_struct.uniforms)
								.map
								(
									(uniform_addr) =>
									{
										const uniform = Uniform.getInstance(uniform_addr);

										uniform.location = gl.getUniformLocation(this.program, uniform.name);

										// Check if shader uses uniform then push uniform to this.uniforms.
										if (uniform.location)
										{
											uniform.update = () =>
											{
												gl.uniformMatrix4fv(uniform.location, false, uniform.typed_data);
											};

											// uniform.update();

											this.uniforms_dict[uniform.name] = uniform;

											return uniform;
										}

										return null;
									},
								)
								.filter((uniform) => uniform);

						// gl.useProgram(null);



						if (renderer._context.constructor === WebGL2RenderingContext)
						{
							this.original_struct.uniform_blocks.forEach
							(
								(uniform_block_addr) =>
								{
									const uniform_block = UniformBlock.getInstance(uniform_block_addr);

									gl.uniformBlockBinding
									(
										this.program,
										gl.getUniformBlockIndex(this.program, uniform_block.name),
										uniform_block.binding,
									);
								},
							);
						}



						// Initially update uniforms.
						this.use();
					}

					use ()
					{
						Material.used_instance = this;

						gl.frontFace(this.front_face);
						gl.useProgram(this.program);

						this.uniforms_seq.forEach((uniform) => uniform.update());
					}
				}

				this.Material = Material;



				class _Object extends wasm.Object
				{
					draw ()
					{
						gl.drawArrays
						(Material.used_instance.topology, this.scene_vertex_data_offset, this.scene_vertex_data_length);
					}
				}

				this.Object = _Object;



				// class ObjectIndexed extends Base
				// {
				// 	constructor (addr)
				// 	{
				// 		super(addr);
				// 	}

				// 	draw (renderer)
				// 	{
				// 		renderer.context.drawElements(this.topology);
				// 	}
				// };

				// this.ObjectIndexed = ObjectIndexed;



				class Scene extends wasm.Scene
				{}

				this.Scene = Scene;
			}

			startLoop ()
			{
				this.loop_function_wrapper = () =>
				{
					this.loop_function();

					this.animation_frame = requestAnimationFrame(this.loop_function_wrapper);
				};

				this.animation_frame = requestAnimationFrame(this.loop_function_wrapper);
			}

			endLoop ()
			{
				cancelAnimationFrame(this.animation_frame);
			}
		}

		this.Renderer = Renderer;
	}
}
