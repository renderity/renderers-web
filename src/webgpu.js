/*
eslint-disable

no-undefined,
*/



import glslang from '@webgpu/glslang/dist/web-devel-onefile/glslang.js';



const getWebgpu =
({
	wasm_wrapper,
	RendererBase,
	UniformBase,
	UniformBlockBase,
	DescriptorSetBase,
	MaterialBase,
	ObjectBase,
	SceneBase,
}) =>
{
	class WebGPU
	{
		constructor ()
		{
			const WasmWrapper = wasm_wrapper.constructor;



			class Renderer extends RendererBase
			{
				// dpr
				constructor (addr_renderer, options)
				{
					super(addr_renderer);

					this.exists = true;



					/* eslint-disable-next-line consistent-this */
					const renderer = this;



					this.canvas = options.canvas || document.createElement('canvas');

					this.canvas.width = this.original_struct.width;
					this.canvas.height = this.original_struct.height;

					this.canvas.style.width = `${ this.original_struct.width }px`;
					this.canvas.style.height = `${ this.original_struct.height }px`;

					this._context = this.canvas.getContext('webgpu');

					if (!this._context || !global.navigator.gpu)
					{
						this.exists = false;

						return undefined;
					}



					this.gpu_resources = [];



					this.loop_function = null;
					this.loop_function_wrapper = null;



					this.adapter = null;
					this.device = null;
					this.render_format = options.render_format;

					this.render_pass_encoder = null;



					this.glslang = null;



					class Uniform extends UniformBase
					{}

					this.Uniform = Uniform;



					class UniformBlock extends UniformBlockBase
					{
						constructor (addr)
						{
							super(addr);



							this.getUniforms(renderer);

							this.buffer =
								renderer.device.createBuffer
								({
									size: this.buffer_length,

									usage:
									(
										global.GPUBufferUsage.COPY_DST |
										global.GPUBufferUsage.UNIFORM
										// global.GPUBufferUsage.COPY_SRC |
										// global.GPUBufferUsage.MAP_WRITE
									),
								});

							renderer.gpu_resources.push(this.buffer);

							// this.buffer.mapAsync(global.GPUMapMode.WRITE);

							this.entry =
							{
								binding: this.binding,

								resource:
								{
									buffer: this.buffer,
									offset: 0,
									size: this.buffer_length,
								},
							};

							// rename to layout
							this.entry_layout =
							{
								binding: this.binding,

								// !
								visibility: global.GPUShaderStage.VERTEX,

								buffer:
								{
									type: 'uniform',
									hasDynamicOffset: false,
									minBindingSize: 0,
								},
							};



							this.use();
						}

						use ()
						{
							for
							(
								let uniform_index = 0;
								uniform_index < this.uniforms_seq.length;
								++uniform_index
							)
							{
								const uniform = this.uniforms_seq[uniform_index];

								// This is analog for vkCmdUpdateBuffer.
								// So it is recommended for updating small amounts of data.
								// May be keep buffer mapped and apdate data with TypedArray.set?
								renderer.device.queue.writeBuffer
								(this.buffer, uniform.block_index, uniform._data, 0, uniform._data.length);
							}
						}
					}

					this.UniformBlock = UniformBlock;



					class StorageBlock
					{
						constructor (addr)
						{
							this.addr = addr;



							this.buffer =
								renderer.device.createBuffer
								({
									size: this.buffer_length,

									usage:
									(
										global.GPUBufferUsage.COPY_DST |
										global.GPUBufferUsage.STORAGE
										// global.GPUBufferUsage.COPY_SRC |
										// global.GPUBufferUsage.MAP_WRITE
									),
								});

							renderer.gpu_resources.push(this.buffer);

							// this.buffer.mapAsync(global.GPUMapMode.WRITE);

							this.entry =
							{
								binding: this.binding,

								resource:
								{
									buffer: this.buffer,
									offset: 0,
									size: this.buffer_length,
								},
							};

							// rename to layout
							this.entry_layout =
							{
								binding: this.binding,

								// !
								visibility: global.GPUShaderStage.COMPUTE | global.GPUShaderStage.FRAGMENT,

								buffer:
								{
									type: 'storage',
									hasDynamicOffset: false,
									minBindingSize: 0,
								},
							};
						}
					}

					this.StorageBlock = StorageBlock;



					// Descriptor set is a bind group in vulkan terms.
					class DescriptorSet extends DescriptorSetBase
					{
						static BINDING_TYPE =
							{
								UNIFORM_BUFFER: 0,
								STORAGE_BUFFER: 1,
							};



						constructor (addr)
						{
							super(addr);



							this.binding_seq = [];
							this.binding_dict = {};

							const bind_group_layout_descriptor =
							{
								entryCount: 0,
								entries: [],
							};

							this.bind_group_descriptor =
							{
								layout: null,

								entryCount: 0,
								entries: [],
							};

							this.original_struct.bindings.forEach
							(
								(binding_addr) =>
								{
									const binding = UniformBlock.getInstance(binding_addr);

									bind_group_layout_descriptor.entries.push(binding.entry_layout);

									++bind_group_layout_descriptor.entryCount;

									this.bind_group_descriptor.entries.push(binding.entry);

									++this.bind_group_descriptor.entryCount;

									this.binding_seq.push(binding);
									this.binding_dict[binding.name] = binding;
								},
							);



							const bind_group_layout =
								renderer.device.createBindGroupLayout(bind_group_layout_descriptor);

							this.bind_group_descriptor.layout = bind_group_layout;

							this.bind_group =
								renderer.device.createBindGroup(this.bind_group_descriptor);



							// use();
						}

						use (bind_group_index)
						{
							renderer.render_pass_encoder.setBindGroup(bind_group_index, this.bind_group, []);

							// use for loop
							this.binding_seq.forEach((binding) => binding.use());
						}
					}

					this.DescriptorSet = DescriptorSet;



					class Material extends MaterialBase
					{
						static TOPOLOGY =
							[
								'triangle-list',
								'point-list',
								'line-list',
								'triangle-strip',
								'line-strip',
							];

						static FRONT_FACE =
							[
								'ccw',
								'cw',
							];

						static BLEND_ENABLED =
							[
								false,
								true,
							];

						static BLEND_FACTOR =
							[
								'zero',
								'one',
							];

						static BLEND_OP =
							[
								'add',
								'subtract',
								'reverse-subtract',
								'min',
								'max',
							];

						static ShaderUsage =
							{
								SPIRV: 0,
								GLSL_VULKAN: 1,
								WGSL: 2,
							};



						constructor (addr, shader_usage = Material.ShaderUsage.WGSL)
						{
							super(addr);



							const pipeline_configuration =
							{
								layout: null,

								vertex:
								{
									module: null,
									entryPoint: 'main',
									// record<USVString, GPUPipelineConstantValue> constants,

									bufferCount: 1,

									buffers:
									[
										{
											arrayStride: 12,
											stepMode: 'vertex',

											attributeCount: 1,

											attributes:
											[
												{
													format: 'float32x3',
													offset: 0,
													shaderLocation: 0,
												},
											],
										},
									],
								},

								primitive:
								{
									frontFace: this.front_face,
									topology: this.topology,
								},

								fragment:
								{
									module: null,
									entryPoint: 'main',

									targetCount: 1,

									targets:
									[
										{
											format: renderer.render_format,

											blend:
											(
												this.blend_enabled ?

													{
														color:
														{
															operation: this.blend_color_op,
															srcFactor: this.blend_color_factor_src,
															dstFactor: this.blend_color_factor_dst,
														},

														alpha:
														{
															operation: this.blend_alpha_op,
															srcFactor: this.blend_alpha_factor_src,
															dstFactor: this.blend_alpha_factor_dst,
														},
													} :

													undefined
											),

											// GPUColorWriteFlags writeMask = 0xF;  // GPUColorWrite.ALL
										},
									],
								},
							};



							{
								let code_vertex = null;
								let code_fragment = null;



								switch (shader_usage)
								{
								case Material.ShaderUsage.SPIRV:
								{
									// Wrap spirv code Uint32Array to another Uint32Array
									// since the provided array must not be shader.
									code_vertex = new Uint32Array(this.original_struct.spirv_code_vertex);
									code_fragment = new Uint32Array(this.original_struct.spirv_code_fragment);

									break;
								}

								// SPIR-V
								case Material.ShaderUsage.GLSL_VULKAN:
								{
									{
										const code_glsl =
											WasmWrapper.convertUint8ArrayToDomString
											(this.original_struct.glsl_vulkan_code_vertex);

										code_vertex = renderer.glslang.compileGLSL(code_glsl, 'vertex');
									}

									{
										const code_glsl =
											WasmWrapper.convertUint8ArrayToDomString
											(this.original_struct.glsl_vulkan_code_fragment);

										code_fragment = renderer.glslang.compileGLSL(code_glsl, 'fragment');
									}

									break;
								}

								case Material.ShaderUsage.WGSL:
								{
									code_vertex =
										WasmWrapper.convertUint8ArrayToDomString
										(this.original_struct.wgsl_code_vertex);

									code_fragment =
										WasmWrapper.convertUint8ArrayToDomString
										(this.original_struct.wgsl_code_fragment);

									break;
								}

								default:
								}



								const shader_module_vertex = renderer.device.createShaderModule({ code: code_vertex });

								pipeline_configuration.vertex.module = shader_module_vertex;

								const shader_module_fragment =
									renderer.device.createShaderModule({ code: code_fragment });

								pipeline_configuration.fragment.module = shader_module_fragment;
							}



							this.descriptor_sets = [];

							const pipeline_layout_descriptor =
							{
								bindGroupLayouts: [],
							};

							this.original_struct.descriptor_sets.forEach
							(
								(descriptor_set_addr) =>
								{
									const descriptor_set = DescriptorSet.getInstance(descriptor_set_addr);

									pipeline_layout_descriptor.bindGroupLayouts.push
									(descriptor_set.bind_group_descriptor.layout);

									this.descriptor_sets.push(descriptor_set);
								},
							);

							pipeline_configuration.layout =
								renderer.device.createPipelineLayout(pipeline_layout_descriptor);



							this.pipeline = renderer.device.createRenderPipeline(pipeline_configuration);
						}

						use ()
						{
							Material.used_instance = this;

							// Use dedicated_descriptor_set?

							renderer.render_pass_encoder.setPipeline(this.pipeline);
						}
					}

					this.Material = Material;



					class ComputePipeline
					{
						constructor (addr, shader_usage = Material.ShaderUsage.WGSL)
						{
							// super(addr);



							const pipeline_configuration =
							{
								layout: null,
							};



							{
								let code = null;



								switch (shader_usage)
								{
								case Material.ShaderUsage.SPIRV:
								{
									code = new Uint32Array(this.original_struct.spirv_code_compute);

									break;
								}

								case Material.ShaderUsage.GLSL_VULKAN:
								{
									const code_glsl =
										WasmWrapper.convertUint8ArrayToDomString
										(this.original_struct.glsl_vulkan_code_compute);

									code = renderer.glslang.compileGLSL(code_glsl, 'compute');

									break;
								}

								case Material.ShaderUsage.WGSL:
								{
									code =
										WasmWrapper.convertUint8ArrayToDomString
										(this.original_struct.wgsl_code_compute);

									break;
								}

								default:
								}



								const shader_module = renderer.device.createShaderModule({ code });

								pipeline_configuration.vertex.module = shader_module;
							}



							this.descriptor_sets = [];

							const pipeline_layout_descriptor =
							{
								bindGroupLayouts: [],
							};

							this.original_struct.descriptor_sets.forEach
							(
								(descriptor_set_addr) =>
								{
									const descriptor_set = DescriptorSet.getInstance(descriptor_set_addr);

									pipeline_layout_descriptor.bindGroupLayouts.push
									(descriptor_set.bind_group_descriptor.layout);

									this.descriptor_sets.push(descriptor_set);
								},
							);

							pipeline_configuration.layout =
								renderer.device.createPipelineLayout(pipeline_layout_descriptor);



							this.pipeline = renderer.device.createRenderPipeline(pipeline_configuration);
						}

						use ()
						{
							// Use dedicated_descriptor_set?

							renderer.render_pass_encoder.setPipeline(this.pipeline);
						}
					}

					this.ComputePipeline = ComputePipeline;



					class _Object extends ObjectBase
					{
						draw ()
						{
							renderer.render_pass_encoder.draw
							(this.scene_vertex_data_length, 1, this.scene_vertex_data_offset, 0);
						}
					}

					this.Object = _Object;



					class Scene extends SceneBase
					{}

					this.Scene = Scene;
				}

				async init ()
				{
					this.glslang = await glslang();

					if (!navigator.gpu)
					{
						return null;
					}

					this.adapter = await navigator.gpu.requestAdapter();

					if (!this.adapter)
					{
						return null;
					}

					this.device = await this.adapter.requestDevice();

					if (!this.render_format)
					{
						this.render_format = this._context.getPreferredFormat(this.adapter);
					}

					this._context.configure
					({
						device: this.device,
						format: this.render_format,
						usage: global.GPUTextureUsage.RENDER_ATTACHMENT,
						// GPUPredefinedColorSpace colorSpace = "srgb";
						// GPUCanvasCompositingAlphaMode compositingAlphaMode = "opaque";

						size:
						{
							width: this.original_struct.width,
							height: this.original_struct.height,
							depthOrArrayLayers: 1,
						},
						// size: [ 800, 600 ],
					});

					return this.adapter;
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

				destroy ()
				{
					this.loop_function = null;
					this.loop_function_wrapper = null;

					this.gpu_resources
						.reverse()
						.forEach
						(
							(handle) =>
							{
								handle.destroy();
							},
						);

					this.Uniform.instances = null;
					this.UniformBlock.instances = null;
					this.DescriptorSet.instances = null;
					this.Material.instances = null;
				}
			}

			this.Renderer = Renderer;
		}
	}

	return WebGPU;
};

export default getWebgpu;
