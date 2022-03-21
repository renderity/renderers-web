/*
eslint-disable

no-undefined,
*/



const getWebgl =
({
	wasm_wrapper,
	RendererBase,
	UniformBase,
	UniformBlockBase,
	MaterialBase,
	ObjectBase,
	SceneBase,
}) =>
{
	class WebGL
	{
		constructor ()
		{
			const WasmWrapper = wasm_wrapper.constructor;



			class Renderer extends RendererBase
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



					this.gpu_resources = [];



					this.loop_function = null;
					this.loop_function_wrapper = null;



					const gl = this._context;

					gl.viewport(0, 0, this.original_struct.width, this.original_struct.height);



					class Uniform extends UniformBase
					{
						constructor (addr)
						{
							super(addr);



							this.location = null;

							// TODO: add multiple typed data initializers.
							this.typed_data = wasm_wrapper.Floatv(this.object_addr, this.size / 4);
						}
					}

					this.Uniform = Uniform;



					class UniformBlock extends UniformBlockBase
					{
						constructor (addr)
						{
							super(addr);



							this.getUniforms(renderer);

							this.buffer = gl.createBuffer();

							renderer.gpu_resources.push([ 'deleteBuffer', this.buffer ]);

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



					class Material extends MaterialBase
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

						static BLEND_ENABLED =
							[
								false,
								true,
							];

						static BLEND_FACTOR =
							[
								gl.ZERO,
								gl.ONE,
							];

						static BLEND_OP =
							[
								gl.FUNC_ADD,
								gl.FUNC_SUBTRACT,
								gl.FUNC_REVERSE_SUBTRACT,
								gl.MIN || this.extensions?.EXT_blend_minmax?.MIN_EXT || null,
								gl.MAX || this.extensions?.EXT_blend_minmax?.MAX_EXT || null,
							];



						constructor (addr)
						{
							super(addr);



							if
							(
								this.original_struct.blend_color_op === null ||
								this.original_struct.blend_alpha_op === null
							)
							{
								// LOG('Enable "EXT_blend_minmax" extension!');
							}



							this.uniforms_seq = null;
							this.uniforms_dict = {};



							this.program = gl.createProgram();

							renderer.gpu_resources.push([ 'deleteProgram', this.program ]);



							// vertex
							{
								let code = null;

								if (renderer._context.constructor === WebGLRenderingContext)
								{
									code =
									WasmWrapper.convertUint8ArrayToDomString(this.original_struct.code_glsl100es_vertex).trim();
								}
								else if (renderer._context.constructor === WebGL2RenderingContext)
								{
									code =
									WasmWrapper.convertUint8ArrayToDomString(this.original_struct.code_glsl300es_vertex).trim();
								}

								const shader = gl.createShader(gl.VERTEX_SHADER);

								renderer.gpu_resources.push([ 'deleteShader', shader ]);

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
									WasmWrapper.convertUint8ArrayToDomString(this.original_struct.code_glsl100es_fragment).trim();
								}
								else if (renderer._context.constructor === WebGL2RenderingContext)
								{
									code =
									WasmWrapper.convertUint8ArrayToDomString(this.original_struct.code_glsl300es_fragment).trim();
								}

								const shader = gl.createShader(gl.FRAGMENT_SHADER);

								renderer.gpu_resources.push([ 'deleteShader', shader ]);

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

							gl.useProgram(this.program);

							gl.frontFace(this.front_face);

							if (this.blend_enabled)
							{
								gl.enable(gl.BLEND);
								gl.blendEquationSeparate(this.blend_color_op, this.blend_alpha_op);

								gl.blendFuncSeparate
								(
									this.blend_color_factor_src,
									this.blend_color_factor_dst,
									this.blend_alpha_factor_src,
									this.blend_alpha_factor_dst,
								);
							}
							else
							{
								gl.disable(gl.BLEND);
							}

							this.uniforms_seq.forEach((uniform) => uniform.update());
						}
					}

					this.Material = Material;



					class _Object extends ObjectBase
					{
						draw ()
						{
							gl.drawArrays
							(Material.used_instance.topology, this.scene_position_data_offset, this.scene_position_data_length);
						}

						drawIndexed ()
						{
							gl.drawElements
							(Material.used_instance.topology, this.scene_index_data_length, gl.UNSIGNED_INT, this.scene_index_data_offset);
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



					class Scene extends SceneBase
					{}

					this.Scene = Scene;
				}

				// Generic methods for all renderers. TODO: share by using base class.
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

				destroy ()
				{
					this.loop_function = null;
					this.loop_function_wrapper = null;

					this.gpu_resources
						.reverse()
						.forEach
						(
							(resource) =>
							{
								const [ delete_function_name, handle ] = resource;

								this._context[delete_function_name](handle);
							},
						);

					this.Uniform.instances = null;
					this.UniformBlock.instances = null;
					this.Material.instances = null;
				}
			}

			this.Renderer = Renderer;
		}
	}

	return WebGL;
};

export default getWebgl;
