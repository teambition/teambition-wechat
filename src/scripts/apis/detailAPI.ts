/// <reference path="../interface/teambition.d.ts" />
module teambition {
  'use strict';
  export interface ITaskData {
    _id: string;
    _executorId: string;
    _projectId: string;
    _taskListId: string;
    tagsId: string[];
    _stageId: string;
    involveMembers: string[];
    updated: string;
    created: string;
    isDone: boolean;
    priority: number;
    dueDate: string;
    note: string;
    content: string;
    likesCount: number;
    recurrence: string[] | string;
    subtaskCount: {
      total: number;
      done: number;
    };
    executor: {
      name: string;
      avatarUrl: string;
      _id: string;
    };
    linked?: ILinkedData[];
    [index: string]: any;
  }

  export interface IFileData {
    _id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    fileKey: string;
    fileCategory: string;
    imageWidth: number;
    imageHeight: number;
    _parentId: string;
    _projectId: string;
    _creatorId: string;
    creator: IMemberData;
    tagIds: string[];
    visiable: string;
    downloadUrl: string;
    thumbnail: string;
    thumbnailUrl: string;
    description: string;
    source: string;
    involveMembers: string[];
    created: string;
    updated: string | number;
    lastVersionTime: string;
    isArchived: boolean;
    previewUrl: string;
    linked?: ILinkedData[];
    [index: string]: any;
  }

  export interface ICollectionData {
    _id: string;
    _parentId: string;
    collectionType: string;
    _creatorId: string;
    _projectId: string;
    description: string;
    title: string;
    updated: string;
    created: string;
    isArchived: boolean;
    workCount: number;
    collectionCount: number;
    color: string;
    [index: string]: any;
  }

  export interface IPostData {
    _id: string;
    postMode: string;
    _projectId: string;
    involveMembers: string[];
    updated: string | number;
    attachments: IFileData[];
    content: string;
    html: string;
    creator: IMemberData;
    title: string;
    linked?: ILinkedData[];
    [index: string]: any;
  }

  export interface IEventData {
    _id: string;
    endDate: string;
    startDate: string;
    _projectId: string;
    location: string;
    content: string;
    title: string;
    updated: string;
    involveMembers: string[];
    linked?: ILinkedData[];
    [index: string]: any;
  }

  export interface IDetailInfos {
    like?: ILikeDataParsed;
    tags?: ITagsData[];
    tasklist?: ITasklistData;
    stage?: IStageData;
  }

  export interface IDetailAPI {
    fetch<T>(_id: string, type: string, linkedId: string): angular.IPromise<T>;
  }

  angular.module('teambition').factory('detailAPI',
  // @ngInject
  (
    $q: angular.IQService,
    RestAPI: IRestAPI,
    Cache: angular.ICacheObject,
    taskParser: ITaskParser,
    postParser: IPostParser,
    eventParser: IPostParser,
    fileParser: IFileParser,
    objectLinkAPI: IObjectLinkAPI,
    likeAPI: ILikeAPI,
    tagsAPI: ITagsAPI,
    stageAPI: IStageAPI,
    tasklistAPI: ITasklistAPI,
    queryFileds: IqueryFileds
  ) => {

    let filedsMap = {
      task: queryFileds.taskFileds,
      post: queryFileds.postFileds,
      event: queryFileds.eventFileds,
      work: queryFileds.workFileds
    };

    let query = (type: string, _id: string, linkedId: string) => {
      let cache = Cache.get(`${type}:detail:${_id}`);
      let deferred = $q.defer();
      if (cache) {
        deferred.resolve(cache);
        return deferred.promise;
      }else {
        RestAPI.get({
          Type: `${type}s`,
          Id: _id,
          _objectLinkId: linkedId,
          fields: filedsMap[type]
        })
        .$promise
        .then((data: any) => {
          Cache.put(`${type}:detail:${_id}`, data);
          return data;
        });
      }
    };

    let detailParser = (detail: any, type: string, detailInfos: IDetailInfos): any => {
      detail.isLike = detailInfos.like.isLike;
      detail.likesGroup = detailInfos.like.likesGroup;
      detail.likedPeople = detailInfos.like.likedPeople;
      detail.likesCount = detailInfos.like.likesCount;
      switch (type) {
        case 'task':
          return taskParser(detail, detailInfos);
        case 'post':
          return postParser(detail);
        case 'work':
          return fileParser(detail);
        case 'event':
          return eventParser(detail);
      }
    };

    let findElementInArray = <T extends {_id: string}>(array: T[], id: string): T => {
      for (let index = 0; index < array.length; index++) {
        let element = array[index];
        if (element._id === id) {
          return element;
        }
      }
    };

    return {
      fetch: (type: string, _id: string, linkedId: string) => {
        return query(type, _id, linkedId)
        .then((data: any) => {
          let detailInfos: IDetailInfos;
          detailInfos = {};
          let fetchTasks = [
            objectLinkAPI.fetch(type, _id)
            .then((linked: ILinkedData[]) => {
              data.linked = linked;
            }),
            likeAPI.getLiked(type, _id)
            .then((liked: ILikeDataParsed) => {
              detailInfos.like = liked;
            }),
            tagsAPI.fetchByObjectId(`${type}s`, _id)
            .then((tags: ITagsData[]) => {
              detailInfos.tags = tags;
            })
          ];
          if (type === 'task') {
            fetchTasks.push(
              tasklistAPI.fetch(data._taskListId)
              .then((tasklist: ITasklistData) => {
                detailInfos.tasklist = tasklist;
              }),
              stageAPI.fetch(data._tasklistId)
              .then((stage: IStageData[]) => {
                detailInfos.stage = findElementInArray(stage, data._tasklistId);
              })
            );
          }
          return $q.all(fetchTasks)
          .then(() => {
            return detailParser(data, type, detailInfos);
          });
        });
      }
    };
  });
}